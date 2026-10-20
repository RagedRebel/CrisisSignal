// ---------------------------------------------------------------------------
// replay-audit.ts — headless full-replay verification.
//
// Drives the exact same replay pipeline the app uses (extraction → resolution →
// merge/fold → urgency/reliability → silence recompute → evaluator) over the
// generated Bengaluru dataset, without a browser. Prints the end-of-replay
// evaluation metrics so they can be compared against the live evaluation page.
//
//   npm run audit
// ---------------------------------------------------------------------------

import { BENGALURU_RAW_EVENTS } from "../src/data/bengaluru";
import { extractWithRules } from "../src/engine/extractor/ruleBased";
import { resolveLocation } from "../src/engine/location/resolver";
import { computeTextFingerprint } from "../src/engine/merger/copyDetect";
import { evaluateReportIncidentMerge } from "../src/engine/merger/merger";
import { computeEvaluationMetrics } from "../src/engine/simulation/evaluator";
import { Incident, ProcessedReport, RawReport, WaterTrend } from "../src/engine/types";
import {
  cloneZones,
  createIncident,
  defaultSettings,
  eventKeyFor,
  foldReportIntoIncident,
  recomputeState,
} from "../src/store/useCrisisStore";

function mapTrend(value: unknown): WaterTrend | null {
  const trend = String(value || "").toLowerCase();
  if (trend === "rising") return "rising";
  if (trend === "falling" || trend === "receding") return "falling";
  if (trend === "stable" || trend === "constant") return "stable";
  return null;
}

/** Mirrors the store's buildProcessedReport for the offline rule-based path. */
function buildProcessedReport(raw: RawReport): ProcessedReport {
  let extracted = extractWithRules(raw.raw_text, raw.source_type);

  if (raw.channel === "sensor" && raw.metadata) {
    extracted = {
      ...extracted,
      life_risk: "none_stated",
      water_level_cm:
        typeof raw.metadata.level_cm === "number"
          ? raw.metadata.level_cm
          : extracted.water_level_cm,
      water_trend: mapTrend(raw.metadata.trend) || extracted.water_trend,
      hazards: [],
      access_status: null,
    };
  }

  const location = resolveLocation(extracted, raw.raw_text, {
    locationHint: raw.location_hint,
    districtHint: raw._gt_district,
  });

  return {
    id: raw.id,
    raw,
    extracted,
    location,
    provenance: raw.provenance,
    evidence_phrase: raw.raw_text.slice(0, 160),
    extraction_status: "validated",
  };
}

async function main() {
  const scenarioEnd = "2022-09-07T18:30:00Z";

  let incidents: Incident[] = [];
  let reports: ProcessedReport[] = [];
  let wards = cloneZones();
  const fingerprints = new Map<string, string>();
  const processedIds = new Set<string>();
  let incidentCounter = 1;
  let suggestionCount = 0;
  let mergedCount = 0;

  // Group arrivals by availability timestamp, exactly like replayTo().
  const byTimestamp = new Map<string, RawReport[]>();
  for (const raw of BENGALURU_RAW_EVENTS) {
    const bucket = byTimestamp.get(raw.timestamp);
    if (bucket) bucket.push(raw);
    else byTimestamp.set(raw.timestamp, [raw]);
  }
  const times = [...byTimestamp.keys()].sort((a, b) => Date.parse(a) - Date.parse(b));

  for (const simTime of times) {
    const batch = byTimestamp
      .get(simTime)!
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const raw of batch) {
      if (processedIds.has(raw.id)) continue;
      const processed = buildProcessedReport(raw);
      processedIds.add(raw.id);

      const fingerprint = computeTextFingerprint(raw.raw_text);
      if (raw.channel !== "sensor" && fingerprints.has(fingerprint)) {
        processed.is_recycled_duplicate = true;
      } else {
        fingerprints.set(fingerprint, raw.id);
      }
      processed.recycled_hash = fingerprint;
      reports.push(processed);

      const eventKey = eventKeyFor(raw);
      let folded = false;

      if (eventKey) {
        const index = incidents.findIndex((incident) => incident.event_key === eventKey);
        if (index >= 0) {
          incidents[index] = foldReportIntoIncident(incidents[index], processed);
          folded = true;
          mergedCount++;
        }
      } else {
        let bestSuggestion: { confidence: number } | null = null;
        for (let i = 0; i < incidents.length; i++) {
          const incident = incidents[i];
          if (incident.event_key) continue;
          if (!incident.location.resolved) continue;

          const evaluation = evaluateReportIncidentMerge(
            processed,
            incident,
            defaultSettings.thresholds.merge_time_window_mins,
            defaultSettings.thresholds.merge_distance_meters
          );

          if (evaluation.canAutoMerge) {
            incidents[i] = foldReportIntoIncident(incident, processed);
            folded = true;
            mergedCount++;
            break;
          }
          if (
            evaluation.canSuggestMerge &&
            (!bestSuggestion || evaluation.confidence > bestSuggestion.confidence)
          ) {
            bestSuggestion = { confidence: evaluation.confidence };
          }
        }
        if (!folded && bestSuggestion) {
          incidents.push(createIncident(raw, processed, incidentCounter++));
          suggestionCount++;
          continue;
        }
      }

      if (!folded) {
        incidents.push(createIncident(raw, processed, incidentCounter++));
      }
    }

    const result = recomputeState(simTime, incidents, reports, wards, defaultSettings);
    incidents = result.incidents;
    wards = result.wards;
  }

  const finalResult = recomputeState(scenarioEnd, incidents, reports, wards, defaultSettings);
  incidents = finalResult.incidents;
  wards = finalResult.wards;

  const metrics = computeEvaluationMetrics(incidents, reports, wards);

  const citizenIncidents = incidents.filter(
    (incident) =>
      !incident.channels.every((channel) => channel === "sensor" || channel === "official")
  );

  console.log("=====================================================");
  console.log("Headless Bengaluru replay audit (full window)");
  console.log("=====================================================");
  console.log(
    `events processed: ${reports.length} | incidents: ${incidents.length} (citizen: ${citizenIncidents.length})`
  );
  console.log(`auto-merge folds: ${mergedCount} | merge suggestions: ${suggestionCount}`);
  console.log("");
  console.log("Extraction:");
  console.log(JSON.stringify(metrics.extraction, null, 2));
  console.log("");
  console.log("Merging:");
  console.log(JSON.stringify(metrics.merging, null, 2));
  console.log("");
  console.log("Ranking:");
  console.log("  CrisisSignal    ", JSON.stringify(metrics.ranking.crisissignal));
  console.log("  LoudestFirst    ", JSON.stringify(metrics.ranking.loudestFirst));
  console.log("  FCFS            ", JSON.stringify(metrics.ranking.fcfs));
  console.log(`  equityStory: ${metrics.ranking.equityStory}`);
  console.log("");
  console.log("Equity:");
  console.log(JSON.stringify(metrics.equity, null, 2));
  console.log("");
  console.log(
    "Flagged zones (end state):",
    wards
      .filter((ward) => ward.is_flagged_silent)
      .map((ward) => `${ward.id} score=${ward.silence_score} flaggedAt=${ward.silence_flagged_at}`)
      .join(" | ") || "(none)"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
