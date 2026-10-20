import {
  ProcessedReport,
  Incident,
  SuggestedMerge,
  LifeRisk,
  Hazard,
  WaterBand,
  WaterTrend,
  AccessStatus,
  Channel,
  SourceType,
} from "../types";
import { areLocationsMergeable } from "./spatial";
import { calculateTextSimilarity, computeTextFingerprint } from "./copyDetect";

export interface MergeEvaluation {
  canAutoMerge: boolean;
  canSuggestMerge: boolean;
  confidence: number;
  reasons: string[];
  blockers: string[];
}

/**
 * Checks whether an incoming processed report can merge with an existing incident.
 */
export function evaluateReportIncidentMerge(
  report: ProcessedReport,
  incident: Incident,
  timeWindowMins = 90,
  distanceMeters = 300
): MergeEvaluation {
  const reasons: string[] = [];
  const blockers: string[] = [];

  // 1. Location must be resolved
  if (!report.location.resolved || !incident.location.resolved) {
    return {
      canAutoMerge: false,
      canSuggestMerge: false,
      confidence: 0,
      reasons: [],
      blockers: ["One or both entities have unlocated coordinates"],
    };
  }

  // 2. Spatial Check
  const spatial = areLocationsMergeable(report.location, incident.location, distanceMeters);
  if (!spatial.mergeable) {
    blockers.push(spatial.reason);
  } else {
    reasons.push(spatial.reason);
  }

  // 3. Temporal Check
  const repTime = new Date(report.raw.timestamp).getTime();
  const incTime = new Date(incident.updated_at).getTime();
  const diffMins = Math.abs(repTime - incTime) / (1000 * 60);

  const effectiveWindowMins =
    report.extracted.water_trend === "rising" || incident.water_trend === "rising"
      ? timeWindowMins * 1.5
      : timeWindowMins;

  if (diffMins > effectiveWindowMins) {
    blockers.push(`Temporal window exceeded: ${Math.round(diffMins)} mins > ${effectiveWindowMins} mins`);
  } else {
    reasons.push(`Temporal alignment: reports within ${Math.round(diffMins)} mins`);
  }

  // 4. CRITICAL SAFETY GUARD: incompatible electrical hazard.
  // Electrical hazards must never silently fold into routine waterlogging.
  // Life-risk differences are allowed to escalate the incident (trapped wins);
  // separating them would hide the more severe report.
  const repHasElectrical = report.extracted.hazards.includes("electrical");
  const incHasElectrical = incident.hazards.includes("electrical");
  if (repHasElectrical !== incHasElectrical && (repHasElectrical || incHasElectrical)) {
    blockers.push(`Hazard mismatch: electrical hazard stated in one report but not the other`);
  }

  // 5. Semantic Check
  const textSim = calculateTextSimilarity(report.raw.raw_text, incident.title);
  const sharedLandmark =
    report.location.landmark_name &&
    incident.location.landmark_name &&
    report.location.landmark_name === incident.location.landmark_name;

  if (sharedLandmark) {
    reasons.push(`Shared landmark anchor: "${report.location.landmark_name}"`);
  }
  if (textSim > 0.3) {
    reasons.push(`Semantic text similarity: ${Math.round(textSim * 100)}%`);
  }

  // Final Decision Logic
  if (blockers.length > 0) {
    return {
      canAutoMerge: false,
      canSuggestMerge: false,
      confidence: 0,
      reasons,
      blockers,
    };
  }

  // Calculate merge confidence score
  let score = 0.5;
  if (spatial.distanceM < 250) score += 0.2;
  if (spatial.distanceM < 100) score += 0.1;
  if (sharedLandmark) score += 0.2;
  if (diffMins < 60) score += 0.1;
  if (report.extracted.water_band === incident.water_band && report.extracted.water_band !== null) score += 0.1;
  score = Math.min(1.0, score);

  const canAutoMerge = score >= 0.75;
  const canSuggestMerge = score >= 0.55 && !canAutoMerge;

  return {
    canAutoMerge,
    canSuggestMerge,
    confidence: score,
    reasons,
    blockers,
  };
}

/**
 * Merges a report into an existing incident, maintaining strict provenance and conflict resolution.
 */
export function mergeReportIntoIncident(
  incident: Incident,
  report: ProcessedReport
): Incident {
  const updatedReportIds = Array.from(new Set([...incident.source_report_ids, report.id]));
  const updatedChannels = Array.from(new Set([...incident.channels, report.raw.channel]));
  const updatedSourceTypes = Array.from(new Set([...incident.source_types, report.raw.source_type]));

  // Track distinct independent reporters (filtering out copy-pasted viral reposts)
  const isRecycled = report.is_recycled_duplicate;
  const distinctCount = isRecycled ? incident.distinct_reporters_count : incident.distinct_reporters_count + 1;

  // Water level conflict resolution: Latest observation wins
  let water_level_cm = incident.water_level_cm;
  let water_band = incident.water_band;
  let water_trend = incident.water_trend;

  const repTime = new Date(report.raw.timestamp).getTime();
  const incTime = new Date(incident.updated_at).getTime();

  if (repTime >= incTime) {
    if (report.extracted.water_level_cm !== null) water_level_cm = report.extracted.water_level_cm;
    if (report.extracted.water_band !== null) water_band = report.extracted.water_band;
    if (report.extracted.water_trend !== null) water_trend = report.extracted.water_trend;
  }

  // People count conflict resolution: become a visible range
  let minCount = incident.people_count_range.min;
  let maxCount = incident.people_count_range.max;

  if (report.extracted.people_count !== null) {
    const rMin =
      typeof report.extracted.people_count === "number"
        ? report.extracted.people_count
        : report.extracted.people_count.min;
    const rMax =
      typeof report.extracted.people_count === "number"
        ? report.extracted.people_count
        : report.extracted.people_count.max;

    if (minCount === 0) {
      minCount = rMin;
      maxCount = rMax;
    } else {
      minCount = Math.min(minCount, rMin);
      maxCount = Math.max(maxCount, rMax);
    }
  }

  let people_count_display = "Unknown";
  if (minCount > 0 || maxCount > 0) {
    people_count_display = minCount === maxCount ? `${minCount} reported` : `${minCount} to ${maxCount} reported`;
  }

  // Life risk escalation: severe risk wins
  const severityOrder: Record<LifeRisk, number> = {
    unconscious: 5,
    medically_dependent: 4,
    trapped: 3,
    injured: 2,
    none_stated: 1,
  };

  const life_risk: LifeRisk =
    severityOrder[report.extracted.life_risk || "none_stated"] > severityOrder[incident.life_risk]
      ? (report.extracted.life_risk || "none_stated")
      : incident.life_risk;

  // Combine vulnerable groups and hazards
  const vulnerable_groups = Array.from(
    new Set([...incident.vulnerable_groups, ...report.extracted.vulnerable_groups])
  );
  const hazards = Array.from(new Set([...incident.hazards, ...report.extracted.hazards]));

  // Access status escalation
  const access_status =
    report.extracted.access_status === "boat_needed" || incident.access_status === "boat_needed"
      ? "boat_needed"
      : report.extracted.access_status === "road_cut" || incident.access_status === "road_cut"
      ? "road_cut"
      : report.extracted.access_status || incident.access_status;

  // Confirmed facts and Unknowns list
  const confirmed_facts: string[] = [];
  const unknown_fields: string[] = [];

  if (water_band) confirmed_facts.push(`Water level: ${water_band}${water_level_cm ? ` (${water_level_cm} cm)` : ""}`);
  else unknown_fields.push("Water depth");

  if (life_risk !== "none_stated") confirmed_facts.push(`Life risk: ${life_risk}`);
  else unknown_fields.push("Life risk status");

  if (people_count_display !== "Unknown") confirmed_facts.push(`People count: ${people_count_display}`);
  else unknown_fields.push("People count");

  if (vulnerable_groups.length > 0) confirmed_facts.push(`Vulnerable groups: ${vulnerable_groups.join(", ")}`);
  if (hazards.length > 0) confirmed_facts.push(`Hazards: ${hazards.join(", ")}`);
  if (access_status) confirmed_facts.push(`Access: ${access_status}`);

  return {
    ...incident,
    source_report_ids: updatedReportIds,
    channels: updatedChannels,
    source_types: updatedSourceTypes,
    distinct_reporters_count: distinctCount,
    updated_at: new Date(Math.max(repTime, incTime)).toISOString(),
    people_count_range: { min: minCount, max: maxCount },
    people_count_display,
    life_risk,
    vulnerable_groups,
    water_band,
    water_level_cm,
    water_trend,
    hazards,
    access_status,
    confirmed_facts,
    unknown_fields,
  };
}
