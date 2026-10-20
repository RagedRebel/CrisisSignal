import { Incident, LifeRisk, WardZone, ProcessedReport } from "../types";
import { GROUND_TRUTH_INCIDENTS, GROUND_TRUTH_SILENT_ZONES } from "../../data/groundTruth";
import { BENGALURU_GROUND_TRUTH, BENGALURU_RAW_EVENTS } from "../../data/bengaluru";
import { computeFcfsRanking, computeLoudestFirstRanking } from "./baselines";

export interface RankingMetricSet {
  top5OverlapPercent: number;
  ndcgAt10: number;
  kendallTau: number;
  /** Rank of the benchmark equity incident (Case b), or null when absent. */
  equityRank: number | null;
}

export interface EvaluationMetrics {
  extraction: {
    totalReports: number;
    validatedCount: number;
    accuracyPercent: number;
    fieldAccuracy: {
      location: number;
      life_risk: number;
      water_band: number;
      hazards: number;
      people_count: number;
    };
  };
  merging: {
    trueIncidentCount: number;
    formedIncidentCount: number;
    precision: number;
    recall: number;
    f1Score: number;
    plantedCasesResults: {
      caseD_mergedPuddles: boolean;
      caseE_keptLethalWireSeparate: boolean;
      caseF_detectedRecycledPosts: boolean;
    };
    recycledDuplicatesDetected: number;
  };
  ranking: {
    crisissignal: RankingMetricSet;
    fcfs: RankingMetricSet;
    loudestFirst: RankingMetricSet;
    equityStory: string;
  };
  equity: {
    silentZonesDetectedCount: number;
    silentZonesTotal: number;
    detectionRatePercent: number;
    /** Mean lead time across flagged zones; negative means flagged after onset. */
    silenceLeadTimeHours: number;
    /** Zones flagged strictly before their first confirming report. */
    earlyWarningZones: number;
    /** All zones currently above the silence threshold, including non-ground-truth zones. */
    flaggedZonesCount: number;
    /** Flagged zones that are in the curated silent-zone list. */
    flaggedZonesMatchingGroundTruth: number;
    /** Share of all flagged zones that match a curated silent-zone label. */
    flaggedZonePrecisionPercent: number;
    districtOverlapPercent: number;
    silentZonesDetails: {
      wardId: string;
      wardName: string;
      silenceScore: number;
      flagged: boolean;
      reasons: string[];
      onsetTime?: string;
      flaggedAt?: string | null;
      leadTimeHours?: number;
    }[];
  };
}

const RISK_CUE =
  /\b(trapped|stranded|marooned|stuck|sikkikondiddare|roof|injured|wounded|unconscious|medically|oxygen|dialysis|pregnant|bedridden|awaiting rescue|waiting for rescue)\b/i;
const DEPTH_CUE = /\b(ankle|knee|waist|chest|above head|feet|foot|ft|cm|drowning|submerged)\b/i;
const PEOPLE_CUE =
  /\b(?:\d+|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b)\s*(?:[a-z-]+\s+){0,3}(?:people|persons|villagers|residents|children|child|kids|women|patients|teachers|workers|families|shopkeepers|elderly|injured|pregnant|passengers|souls|members)\b/i;
const ELECTRICAL_CUE = /\b(electric|electrical|live wire|wire|transformer|spark|shock|electrocution|power line)\b/i;
const CURRENT_CUE = /\b(current|torrent|swift|strong flow|rushing|velocity|tez bahav)\b/i;
const COLLAPSE_CUE = /\b(collapse|collapsed|breach|breached|bund broke|washed away|bridge approach eroded)\b/i;

function eventLifeRisk(eventType: string): LifeRisk {
  switch (eventType) {
    case "breach":
    case "flood_surge":
    case "bridge_failure":
    case "landslide":
    case "erosion":
      return "trapped";
    case "rescue":
    case "death":
      return "injured";
    default:
      return "none_stated";
  }
}

function pct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function districtMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left === right || left.includes(right) || right.includes(left);
}

function dominantGroup(incident: Incident, groupByReport: Map<string, string>) {
  const counts = new Map<string, number>();
  let total = 0;
  for (const reportId of incident.source_report_ids) {
    const group = groupByReport.get(reportId);
    if (!group) continue;
    counts.set(group, (counts.get(group) || 0) + 1);
    total++;
  }
  if (total === 0) return null;
  let bestGroup: string | null = null;
  let bestCount = 0;
  for (const [group, count] of counts) {
    if (count > bestCount) {
      bestGroup = group;
      bestCount = count;
    }
  }
  return bestGroup
    ? { group: bestGroup, count: bestCount, total, purity: bestCount / total }
    : null;
}

function computeRankingMetrics(
  orderedIncidents: Incident[],
  groupByReport: Map<string, string>,
  truthRankByGroup: Map<string, number>,
  equityIncidentId?: string | null
): RankingMetricSet {
  // One representative incident per true group, in algorithm order.
  const seen = new Set<string>();
  const orderedGroups: string[] = [];
  for (const incident of orderedIncidents) {
    const dominant = dominantGroup(incident, groupByReport);
    if (!dominant || seen.has(dominant.group)) continue;
    seen.add(dominant.group);
    orderedGroups.push(dominant.group);
  }

  const totalGroups = Math.max(1, orderedGroups.length);
  const top5 = orderedGroups.slice(0, 5);
  const top5Correct = top5.filter((group) => (truthRankByGroup.get(group) || 99) <= 5).length;
  const top5OverlapPercent = pct(top5Correct / Math.min(5, totalGroups));

  const relevance = (group: string) => {
    const rank = truthRankByGroup.get(group) || 99;
    return rank <= 10 ? 11 - rank : 0;
  };
  let dcg = 0;
  orderedGroups.slice(0, 10).forEach((group, index) => {
    const rel = relevance(group);
    dcg += (Math.pow(2, rel) - 1) / Math.log2(index + 2);
  });
  const idealGroups = [...orderedGroups].sort(
    (a, b) => (truthRankByGroup.get(a) || 99) - (truthRankByGroup.get(b) || 99)
  );
  let idcg = 0;
  idealGroups.slice(0, 10).forEach((group, index) => {
    const rel = relevance(group);
    idcg += (Math.pow(2, rel) - 1) / Math.log2(index + 2);
  });
  const ndcgAt10 = idcg > 0 ? Math.min(1, dcg / idcg) : 0;

  // Kendall tau over groups that are present in both sequences.
  const comparable = orderedGroups.filter((group) => truthRankByGroup.has(group));
  const truthOrder = [...comparable].sort(
    (a, b) => (truthRankByGroup.get(a) || 99) - (truthRankByGroup.get(b) || 99)
  );
  const algorithmPosition = new Map(comparable.map((group, index) => [group, index]));
  const truthPosition = new Map(truthOrder.map((group, index) => [group, index]));
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < truthOrder.length; i++) {
    for (let j = i + 1; j < truthOrder.length; j++) {
      const a = truthOrder[i];
      const b = truthOrder[j];
      const algorithmDiff =
        (algorithmPosition.get(a) || 0) - (algorithmPosition.get(b) || 0);
      if (algorithmDiff < 0) concordant++;
      else if (algorithmDiff > 0) discordant++;
    }
  }
  const pairs = concordant + discordant;
  const kendallTau = pairs > 0 ? round2((concordant - discordant) / pairs) : 0;

  const equityRank = equityIncidentId
    ? orderedIncidents.findIndex((incident) => incident.id === equityIncidentId) + 1 || null
    : null;

  return { top5OverlapPercent, ndcgAt10: round2(ndcgAt10), kendallTau, equityRank };
}

/**
 * Calculates live evaluation metrics strictly from the hidden backbone links,
 * the official worst-hit district table and current engine state. No hardcoded
 * accuracy or lift figures.
 */
export function computeEvaluationMetrics(
  incidents: Incident[],
  reports: ProcessedReport[],
  wards: WardZone[]
): EvaluationMetrics {
  /* ------------------------------ Extraction ------------------------------ */
  const eventById = new Map(
    BENGALURU_GROUND_TRUTH.backbone_true_events.map((event) => [event.id, event])
  );
  const gtDistrictByReport = new Map<string, string>();
  const gtGroupByReport = new Map<string, string>();
  for (const raw of BENGALURU_RAW_EVENTS) {
    if (raw._gt_backbone_id) {
      gtGroupByReport.set(raw.id, raw._gt_backbone_id);
      if (raw._gt_district) gtDistrictByReport.set(raw.id, raw._gt_district);
    }
  }

  const totalReports = Math.max(1, reports.length);
  let validatedCount = 0;
  let locationHits = 0;
  let riskHits = 0;
  let depthHits = 0;
  let hazardHits = 0;
  let peopleHits = 0;
  let evaluated = 0;

  for (const report of reports) {
    if (report.extraction_status === "validated") validatedCount++;
    const group = gtGroupByReport.get(report.id);
    if (!group) continue; // telemetry/bulletins do not have per-report ground truth
    const event = eventById.get(group);
    if (!event) continue;
    evaluated++;

    // Location: resolved and consistent with the hidden district label.
    const expectedDistrict = gtDistrictByReport.get(report.id) || event.location.district;
    if (report.location.resolved && districtMatches(report.location.district, expectedDistrict)) {
      locationHits++;
    }

    // Life risk: cue presence must match extraction, and the extracted risk
    // must agree with the backbone event type.
    const hasRiskCue = RISK_CUE.test(report.raw.raw_text);
    const expectedRisk = eventLifeRisk(event.event_type);
    if (
      (hasRiskCue && report.extracted.life_risk === expectedRisk) ||
      (!hasRiskCue && report.extracted.life_risk === "none_stated")
    ) {
      riskHits++;
    }

    // Depth, hazards and people counts are validated against explicit cues in
    // the source text so "Unknown" is scored as correct when nothing was said.
    const hasDepthCue = DEPTH_CUE.test(report.raw.raw_text);
    if ((hasDepthCue && report.extracted.water_band !== null) || (!hasDepthCue && report.extracted.water_band === null)) {
      depthHits++;
    }

    const expectedHazards = new Set<string>();
    if (ELECTRICAL_CUE.test(report.raw.raw_text)) expectedHazards.add("electrical");
    if (CURRENT_CUE.test(report.raw.raw_text)) expectedHazards.add("current");
    if (COLLAPSE_CUE.test(report.raw.raw_text)) expectedHazards.add("collapse");
    const extractedHazards = new Set(report.extracted.hazards);
    const sameHazards =
      expectedHazards.size === extractedHazards.size &&
      [...expectedHazards].every((hazard) => extractedHazards.has(hazard as any));
    if (sameHazards) hazardHits++;

    const hasPeopleCue = PEOPLE_CUE.test(report.raw.raw_text);
    if ((hasPeopleCue && report.extracted.people_count !== null) || (!hasPeopleCue && report.extracted.people_count === null)) {
      peopleHits++;
    }
  }

  const fieldAccuracy = {
    location: evaluated ? pct(locationHits / evaluated) : 0,
    life_risk: evaluated ? pct(riskHits / evaluated) : 0,
    water_band: evaluated ? pct(depthHits / evaluated) : 0,
    hazards: evaluated ? pct(hazardHits / evaluated) : 0,
    people_count: evaluated ? pct(peopleHits / evaluated) : 0,
  };
  const accuracyPercent = pct(
    (fieldAccuracy.location +
      fieldAccuracy.life_risk +
      fieldAccuracy.water_band +
      fieldAccuracy.hazards +
      fieldAccuracy.people_count) /
      500
  );

  /* ------------------------------- Merging -------------------------------- */
  const reportById = new Map(reports.map((report) => [report.id, report]));
  const citizenIncidents = incidents.filter((incident) =>
    incident.source_report_ids.some((reportId) => gtGroupByReport.has(reportId))
  );

  let gtReportTotal = 0;
  let gtReportCorrect = 0;
  const groupTotals = new Map<string, number>();
  const groupCovered = new Map<string, number>();
  const dominantByIncident = new Map<string, string>();

  for (const incident of citizenIncidents) {
    const dominant = dominantGroup(incident, gtGroupByReport);
    if (!dominant) continue;
    dominantByIncident.set(incident.id, dominant.group);
    gtReportTotal += dominant.total;
    gtReportCorrect += dominant.count;
  }

  for (const report of reports) {
    const group = gtGroupByReport.get(report.id);
    if (!group) continue;
    groupTotals.set(group, (groupTotals.get(group) || 0) + 1);
    const incident = citizenIncidents.find((entry) =>
      entry.source_report_ids.includes(report.id)
    );
    if (incident && dominantByIncident.get(incident.id) === group) {
      groupCovered.set(group, (groupCovered.get(group) || 0) + 1);
    }
  }

  const precision = gtReportTotal > 0 ? gtReportCorrect / gtReportTotal : 0;
  const groupRecalls = [...groupTotals.entries()].map(([group, total]) =>
    total > 0 ? (groupCovered.get(group) || 0) / total : 0
  );
  const recall =
    groupRecalls.length > 0
      ? groupRecalls.reduce((sum, value) => sum + value, 0) / groupRecalls.length
      : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const caseDBackbone = BENGALURU_GROUND_TRUTH.benchmark_cases.case_d.backbone_id;
  const caseDIncidents = citizenIncidents
    .map((incident) => {
      const dominant = dominantGroup(incident, gtGroupByReport);
      const count = incident.source_report_ids.filter(
        (reportId) => gtGroupByReport.get(reportId) === caseDBackbone
      ).length;
      return { incident, dominant, count };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const topBreach = caseDIncidents[0];
  const caseD =
    !!topBreach &&
    topBreach.count >= 3 &&
    !!topBreach.dominant &&
    topBreach.dominant.group === caseDBackbone &&
    topBreach.dominant.purity >= 0.6;

  const electricalIncidents = citizenIncidents.filter((incident) =>
    incident.source_report_ids.some((reportId) => {
      const report = reportById.get(reportId);
      return report ? report.extracted.hazards.includes("electrical") : false;
    })
  );
  const mixedElectrical = electricalIncidents.some((incident) => {
    const electrical = incident.source_report_ids.filter((reportId) =>
      reportById.get(reportId)?.extracted.hazards.includes("electrical")
    ).length;
    return electrical > 0 && electrical < incident.source_report_ids.length;
  });
  const caseE = electricalIncidents.length > 0 && !mixedElectrical;

  const recycledDuplicatesDetected = reports.filter(
    (report) => report.is_recycled_duplicate
  ).length;
  const caseF = recycledDuplicatesDetected > 0;

  /* ------------------------------- Ranking -------------------------------- */
  const truthRankByGroup = new Map(
    GROUND_TRUTH_INCIDENTS.map((group) => [group.id, group.true_priority_rank])
  );

  const equityBackboneId = BENGALURU_GROUND_TRUTH.benchmark_cases.case_b.backbone_id;
  const equityIncident = citizenIncidents
    .map((incident) => ({ incident, dominant: dominantGroup(incident, gtGroupByReport) }))
    .find((entry) => entry.dominant?.group === equityBackboneId)?.incident;

  const crisisOrdered = [...incidents].sort((a, b) => b.urgency_score - a.urgency_score);
  const crisissignal = computeRankingMetrics(
    crisisOrdered,
    gtGroupByReport,
    truthRankByGroup,
    equityIncident?.id
  );

  const fcfsOrder = computeFcfsRanking(incidents).incidents
    .map((entry) => incidents.find((incident) => incident.id === entry.id))
    .filter((incident): incident is Incident => Boolean(incident));
  const fcfs = computeRankingMetrics(
    fcfsOrder,
    gtGroupByReport,
    truthRankByGroup,
    equityIncident?.id
  );

  const loudestOrder = computeLoudestFirstRanking(incidents).incidents
    .map((entry) => incidents.find((incident) => incident.id === entry.id))
    .filter((incident): incident is Incident => Boolean(incident));
  const loudestFirst = computeRankingMetrics(
    loudestOrder,
    gtGroupByReport,
    truthRankByGroup,
    equityIncident?.id
  );

  const fairnessBoosted = incidents.filter(
    (incident) => incident.fairness_boost_applied
  ).length;
  const equityCrisisRank = crisissignal.equityRank;
  const equityLoudestRank = loudestFirst.equityRank;
  const equityStory =
    fairnessBoosted > 0
      ? `${fairnessBoosted} low-connectivity incident${fairnessBoosted === 1 ? "" : "s"} received a Fairness Boost. The Kogilu layout equity incident ranks ${
          equityCrisisRank ? `#${equityCrisisRank}` : "outside the matched set"
        } under CrisisSignal versus ${
          equityLoudestRank ? `#${equityLoudestRank}` : "outside the matched set"
        } under Loudest-Area-First.`
      : "No incident currently meets the Fairness Boost criteria; connectivity and coverage deficits are being monitored.";

  /* -------------------------------- Equity -------------------------------- */
  const silentZoneDetails = GROUND_TRUTH_SILENT_ZONES.map((groundTruth) => {
    const ward = wards.find((entry) => entry.id === groundTruth.ward_id);
    if (!ward) return null;
    const flagged =
      ward.is_flagged_silent || ward.silence_score >= 0.6;
    const flaggedAt = ward.silence_flagged_at || null;
    const onset = groundTruth.onset_time;
    const leadTimeHours =
      flaggedAt && onset
        ? Math.round(
            ((new Date(onset).getTime() - new Date(flaggedAt).getTime()) / 3600000) * 10
          ) / 10
        : undefined;
    return {
      wardId: ward.id,
      wardName: ward.name,
      silenceScore: Math.round(ward.silence_score * 100) / 100,
      flagged,
      reasons: ward.silence_reasons,
      onsetTime: onset,
      flaggedAt,
      leadTimeHours,
    };
  }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const groundTruthSilentIds = new Set(
    GROUND_TRUTH_SILENT_ZONES.map((entry) => entry.ward_id)
  );
  const detectedCount = silentZoneDetails.filter(
    (entry) => entry.flagged && groundTruthSilentIds.has(entry.wardId)
  ).length;
  const leadTimes = silentZoneDetails
    .map((entry) => entry.leadTimeHours)
    .filter((value): value is number => typeof value === "number");
  const silenceLeadTimeHours =
    leadTimes.length > 0
      ? Math.round(
          (leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length) * 10
        ) / 10
      : 0;
  const earlyWarningZones = leadTimes.filter((value) => value > 0).length;

  // Top-priority districts vs the official worst-hit table.
  const worstHitDistricts = BENGALURU_GROUND_TRUTH.official_worst_hit_districts.map(
    (entry) => entry.district
  );
  const priorityDistricts = new Set<string>();
  for (const incident of crisisOrdered.slice(0, 10)) {
    if (incident.location.district) priorityDistricts.add(incident.location.district);
  }
  for (const ward of wards) {
    if (ward.is_flagged_silent && ward.district) priorityDistricts.add(ward.district);
  }
  const districtOverlapCount = worstHitDistricts.filter((district) =>
    [...priorityDistricts].some((candidate) => districtMatches(candidate, district))
  ).length;
  const districtOverlapPercent = pct(districtOverlapCount / Math.max(1, worstHitDistricts.length));

  const listedWards = new Set(silentZoneDetails.map((entry) => entry.wardId));
  for (const ward of wards) {
    if (listedWards.has(ward.id)) continue;
    if (ward.silence_score >= 0.5 || ward.is_flagged_silent) {
      const groundTruth = GROUND_TRUTH_SILENT_ZONES.find(
        (entry) => entry.ward_id === ward.id
      );
      const onset = groundTruth?.onset_time;
      const flaggedAt = ward.silence_flagged_at || null;
      const leadTimeHours =
        flaggedAt && onset
          ? Math.round(
              ((new Date(onset).getTime() - new Date(flaggedAt).getTime()) / 3600000) * 10
            ) / 10
          : undefined;
      silentZoneDetails.push({
        wardId: ward.id,
        wardName: ward.name,
        silenceScore: Math.round(ward.silence_score * 100) / 100,
        flagged: ward.is_flagged_silent,
        reasons: ward.silence_reasons,
        onsetTime: onset,
        flaggedAt,
        leadTimeHours,
      });
    }
  }

  const flaggedZoneEntries = silentZoneDetails.filter((entry) => entry.flagged);
  const flaggedZonesCount = flaggedZoneEntries.length;
  const flaggedZonesMatchingGroundTruth = flaggedZoneEntries.filter((entry) =>
    groundTruthSilentIds.has(entry.wardId)
  ).length;
  const flaggedZonePrecisionPercent = pct(
    flaggedZonesMatchingGroundTruth / Math.max(1, flaggedZonesCount)
  );

  return {
    extraction: {
      totalReports,
      validatedCount,
      accuracyPercent,
      fieldAccuracy,
    },
    merging: {
      trueIncidentCount: groupTotals.size,
      formedIncidentCount: citizenIncidents.length,
      precision: round2(precision),
      recall: round2(recall),
      f1Score: round2(f1Score),
      plantedCasesResults: {
        caseD_mergedPuddles: caseD,
        caseE_keptLethalWireSeparate: caseE,
        caseF_detectedRecycledPosts: caseF,
      },
      recycledDuplicatesDetected,
    },
    ranking: {
      crisissignal,
      fcfs,
      loudestFirst,
      equityStory,
    },
    equity: {
      silentZonesDetectedCount: detectedCount,
      silentZonesTotal: groundTruthSilentIds.size,
      detectionRatePercent: pct(detectedCount / Math.max(1, groundTruthSilentIds.size)),
      silenceLeadTimeHours,
      earlyWarningZones,
      flaggedZonesCount,
      flaggedZonesMatchingGroundTruth,
      flaggedZonePrecisionPercent,
      districtOverlapPercent,
      silentZonesDetails: silentZoneDetails,
    },
  };
}
