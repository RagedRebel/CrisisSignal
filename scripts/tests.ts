import assert from "node:assert";
import { extractWithRules } from "../src/engine/extractor/ruleBased";
import { resolveLocation } from "../src/engine/location/resolver";
import { calculateTextSimilarity, computeTextFingerprint } from "../src/engine/merger/copyDetect";
import { evaluateReportIncidentMerge, mergeReportIntoIncident } from "../src/engine/merger/merger";
import { calculateReliability } from "../src/engine/scoring/reliability";
import { calculateUrgency } from "../src/engine/scoring/urgency";
import { calculateWardSilenceScore } from "../src/engine/scoring/silence";
import { Incident, ProcessedReport, RawReport } from "../src/engine/types";
import {
  BENGALURU_GAZETTEER,
  BENGALURU_GROUND_TRUTH,
  BENGALURU_RAW_EVENTS,
  BENGALURU_RECONSTRUCTED,
  BENGALURU_WARD_ZONES,
} from "../src/data/bengaluru";

console.log("=================================================");
console.log("Running CrisisSignal Priority Engine Unit Tests");
console.log("(Bengaluru 2022 synthetic flood replay)");
console.log("=================================================");

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function rawById(id: string): RawReport {
  const raw = BENGALURU_RAW_EVENTS.find((report) => report.id === id);
  assert.ok(raw, `Missing replay event ${id}`);
  return raw!;
}

function processReport(id: string): ProcessedReport {
  const raw = rawById(id);
  const extracted = extractWithRules(raw.raw_text);
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

/** Processes a synthetic text that is not part of the replay dataset. */
function processText(id: string, text: string, timestamp: string): ProcessedReport {
  const raw: RawReport = {
    id,
    timestamp,
    channel: "sms",
    sender_id: "test-reporter",
    source_type: "first_hand",
    raw_text: text,
    provenance: "reconstructed",
  };
  const extracted = extractWithRules(text);
  const location = resolveLocation(extracted, text);
  return {
    id,
    raw,
    extracted,
    location,
    provenance: raw.provenance,
    evidence_phrase: text.slice(0, 160),
    extraction_status: "validated",
  };
}

function incidentFrom(report: ProcessedReport, eventKey?: string): Incident {
  const extracted = report.extracted;
  const people = extracted.people_count;
  const range =
    typeof people === "number"
      ? { min: people, max: people }
      : people
      ? { min: people.min, max: people.max }
      : { min: 0, max: 0 };

  return {
    id: `inc-${report.id}`,
    incident_number: 1,
    title: `${report.location.landmark_name || report.raw._gt_district || "Bengaluru"} — report`,
    primary_report_id: report.id,
    source_report_ids: [report.id],
    event_key: eventKey,
    channels: [report.raw.channel],
    source_types: [report.raw.source_type],
    provenance: report.provenance,
    distinct_reporters_count: 1,
    created_at: report.raw.timestamp,
    updated_at: report.raw.timestamp,
    location: report.location,
    people_count_display: range.max ? `${range.min} reported` : "Unknown",
    people_count_range: range,
    life_risk: extracted.life_risk || "none_stated",
    vulnerable_groups: extracted.vulnerable_groups,
    water_band: extracted.water_band,
    water_level_cm: extracted.water_level_cm,
    water_trend: extracted.water_trend,
    hazards: extracted.hazards,
    access_status: extracted.access_status,
    confirmed_facts: [],
    unknown_fields: [],
    reliability_score: 50,
    reliability_reasons: { pro: [], con: [] },
    is_verify_urgently: false,
    urgency_score: 0,
    urgency_breakdown: {
      life_risk_component: 0,
      vulnerability_component: 0,
      hazard_component: 0,
      time_waiting_component: 0,
      access_component: 0,
      reliability_component: 0,
      fairness_boost: 0,
      total: 0,
    },
    fairness_boost_applied: false,
    status: "active",
    priority_rank: 1,
  };
}

// 1. Data integrity
console.log("\n[1] Bengaluru 2022 replay data integrity");
it("Loads all six input channels with provenance labels", () => {
  const channels = new Set(BENGALURU_RAW_EVENTS.map((event) => event.channel));
  for (const channel of [
    "call_transcript",
    "sms",
    "social",
    "sensor",
    "volunteer_app",
    "official",
  ]) {
    assert.ok(channels.has(channel as never), `Missing channel ${channel}`);
  }
  assert.strictEqual(BENGALURU_RAW_EVENTS.length, 767);
  assert.strictEqual(BENGALURU_RECONSTRUCTED.length, 300);
  assert.strictEqual(BENGALURU_GAZETTEER.length, 60);
  assert.strictEqual(BENGALURU_WARD_ZONES.length, 12);
  assert.ok(
    BENGALURU_RAW_EVENTS.every((event) => Boolean(event.provenance)),
    "Every event needs a provenance badge"
  );
  assert.ok(
    BENGALURU_RAW_EVENTS.every((event) => event.provenance === "reconstructed"),
    "The whole replay dataset is synthetic"
  );
});

it("Every reconstructed report links to a real backbone group", () => {
  const backboneIds = new Set(
    BENGALURU_GROUND_TRUTH.backbone_true_events.map((event) => event.id)
  );
  assert.strictEqual(backboneIds.size, 10, "Expected ten backbone groups");
  for (const report of BENGALURU_RECONSTRUCTED) {
    assert.ok(report._gt_backbone_id, `${report.id} has no hidden backbone link`);
    assert.ok(backboneIds.has(report._gt_backbone_id), `${report.id} links to an unknown group`);
  }
});

it("Ground truth exposes the six benchmark cases and silent zones", () => {
  const cases = BENGALURU_GROUND_TRUTH.benchmark_cases;
  assert.deepStrictEqual(
    Object.keys(cases).sort(),
    ["case_a", "case_b", "case_c", "case_d", "case_e", "case_f"]
  );
  const zoneIds = new Set(BENGALURU_WARD_ZONES.map((zone) => zone.id));
  for (const entry of Object.values(cases)) {
    assert.ok(zoneIds.has(entry.zone_id), `${entry.backbone_id} references unknown zone`);
  }
  assert.strictEqual(BENGALURU_GROUND_TRUTH.silent_zones.length, 2);
  for (const zone of BENGALURU_GROUND_TRUTH.silent_zones) {
    assert.ok(zone.failure_mode, `Silent zone ${zone.zone_id} needs a failure mode`);
    assert.ok(zoneIds.has(zone.zone_id), `Unknown silent zone ${zone.zone_id}`);
  }
});

// 2. Extractor tests
console.log("\n[2] Extractor tests (Kanglish/Hindi/Hinglish and evidence spans)");
it("Extracts trapped residents, pregnant/elderly groups and knee water", () => {
  // "Emergency at Kempapura Main Road... 24 residents are trapped ... A pregnant
  // woman and an elderly couple ... knee deep (48cm) ... underpass is blocked"
  const report = processReport("rep-0279");
  assert.strictEqual(report.extracted.life_risk, "trapped");
  assert.strictEqual(report.extracted.water_band, "knee");
  const people = report.extracted.people_count;
  assert.ok(people && typeof people === "object");
  assert.strictEqual(people!.min, 24);
  assert.ok(report.extracted.vulnerable_groups.includes("elderly"));
  assert.ok(report.extracted.vulnerable_groups.includes("pregnant"));
  assert.strictEqual(report.extracted.access_status, "blocked");
  assert.ok(report.extracted.evidence_spans.life_risk);
  assert.ok(report.extracted.evidence_spans.water_band);
});

it("Detects lethal electrical hazards in urban floodwater", () => {
  // "Transformer near Kempapura Substation is sparking; a power line fell..."
  const report = processReport("rep-0256");
  assert.ok(report.extracted.hazards.includes("electrical"));
});

it("Detects a lake-gate breach with collapse and current hazards", () => {
  // "The Bellandur lake gate breach widened overnight at Bellandur Lake Gate..."
  const report = processReport("rep-0108");
  assert.ok(report.extracted.hazards.includes("collapse"));
  assert.ok(report.extracted.hazards.includes("current"));
  assert.strictEqual(report.extracted.life_risk, "trapped");
});

it("Missing fields default to Unknown and are never invented", () => {
  const extracted = extractWithRules(
    "Water logging at Koramangala JNC. My bicycle got splashed."
  );
  assert.strictEqual(extracted.people_count, null);
  assert.strictEqual(extracted.life_risk, "none_stated");
  assert.strictEqual(extracted.hazards.length, 0);
});

// 3. Location resolver tests
console.log("\n[3] Location resolver tests");
it("Resolves an exact Bengaluru gazetteer alias", () => {
  const text = "Water entered homes at Kogilu Cross after the drain overflowed";
  const location = resolveLocation(extractWithRules(text), text);
  assert.strictEqual(location.resolved, true);
  assert.strictEqual(location.resolution_method, "exact_landmark");
  assert.strictEqual(location.landmark_name, "Kogilu Cross");
  assert.strictEqual(location.district, "Yelahanka");
});

it("Falls back to a district centroid instead of inventing a locality", () => {
  const text = "Flooding across West Bengaluru after heavy rain, many villages cut off";
  const location = resolveLocation(extractWithRules(text), text, {
    districtHint: "West Bengaluru",
  });
  assert.strictEqual(location.resolved, true);
  assert.strictEqual(location.resolution_method, "district_centroid");
  assert.strictEqual(location.district, "West Bengaluru");
  assert.ok((location.uncertainty_radius_m || 0) >= 5000);
});

it("Routes a vague message to Needs Location without placing a pin", () => {
  const text = "Paani bohot bhar gaya hai hamare ghar me sab doob raha hai bachao!";
  const location = resolveLocation(extractWithRules(text), text);
  assert.strictEqual(location.resolved, false);
  assert.strictEqual(location.coords, null);
  assert.strictEqual(location.needs_location_lane, true);
});

// 4. Merger & safety tests
console.log("\n[4] Duplicate merger & safety guardrails");
it("Case (d): same-location Ejipura underpass reports auto-merge", () => {
  const first = processReport("rep-0144");
  const second = processReport("rep-0145");
  let incident = incidentFrom(first);
  const evaluation = evaluateReportIncidentMerge(second, incident, 360, 600);
  assert.strictEqual(evaluation.canAutoMerge, true, evaluation.blockers.join("; "));
  incident = mergeReportIntoIncident(incident, second);
  assert.strictEqual(incident.source_report_ids.length, 2);
});

it("Case (e): electrical hazard cannot merge into routine waterlogging", () => {
  const routine = incidentFrom(processReport("rep-0268"));
  const wire = processReport("rep-0256");
  const evaluation = evaluateReportIncidentMerge(wire, routine, 360, 600);
  assert.strictEqual(evaluation.canAutoMerge, false);
  assert.ok(
    evaluation.blockers.some((blocker) => blocker.includes("Hazard mismatch"))
  );
});

it("Life-risk differences escalate the incident instead of hiding it", () => {
  const routine = incidentFrom(
    processText(
      "routine-1",
      "Small puddle outside Kadubeesanahalli Junction has become ankle-deep (15cm). Two-wheelers are being pushed.",
      "2022-08-30T05:50:00Z"
    )
  );
  const trapped = processReport("rep-0006");
  const evaluation = evaluateReportIncidentMerge(trapped, routine, 360, 600);
  assert.strictEqual(evaluation.canAutoMerge, true, evaluation.blockers.join("; "));
  const merged = mergeReportIntoIncident(routine, trapped);
  assert.strictEqual(merged.life_risk, "trapped");
  assert.ok(merged.vulnerable_groups.includes("pregnant"));
});

it("Case (f): recycled viral copy-paste is fingerprinted", () => {
  const first = rawById("rep-0017");
  const second = rawById("rep-0018");
  const similarity = calculateTextSimilarity(first.raw_text, second.raw_text);
  assert.ok(similarity >= 0.95, `Expected near-identical text, got ${similarity}`);
  assert.strictEqual(
    computeTextFingerprint(first.raw_text),
    computeTextFingerprint(second.raw_text)
  );
  assert.strictEqual(second._gt_is_duplicate_of, "rep-0017");
  assert.ok(!first._gt_is_duplicate_of, "The originator must not be marked a duplicate");
});

// 5. Reliability, urgency and equity
console.log("\n[5] Reliability, urgency & equity tests");
it("Second-hand trapped report is flagged VERIFY URGENTLY", () => {
  const reliability = calculateReliability(incidentFrom(processReport("rep-0191")));
  assert.strictEqual(reliability.isVerifyUrgently, true);
  assert.ok(reliability.cons.some((reason) => reason.includes("second-hand")));
});

it("Case (b): low-connectivity Kogilu report receives a Fairness Boost", () => {
  const incident = incidentFrom(processReport("rep-0190"));
  const ward = BENGALURU_WARD_ZONES.find((zone) => zone.id === "zone-yelahanka");
  assert.ok(ward);
  const urgency = calculateUrgency(
    incident,
    { ...ward!, report_coverage: 0.2 },
    incident.updated_at
  );
  assert.strictEqual(urgency.fairness_boost_applied, true);
  assert.ok(urgency.breakdown.fairness_boost > 0);
});

// 6. Silence layer calibration
console.log("\n[6] Silence layer & calibration tests");
it("High-risk zones are NOT flagged before any flood signal exists", () => {
  const ward = BENGALURU_WARD_ZONES.find((zone) => zone.id === "zone-yelahanka")!;
  const quiet = { ...ward, actual_reports_count: 0, report_coverage: 0 };
  const result = calculateWardSilenceScore(
    quiet,
    BENGALURU_WARD_ZONES,
    [],
    "2022-08-22T06:00:00Z"
  );
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.isFlaggedSilent, false);
});

it("Case (c): Jakkur culvert collapse drops connectivity and flags Thanisandra", () => {
  const ward = BENGALURU_WARD_ZONES.find((zone) => zone.id === "zone-north")!;
  const active = { ...ward, actual_reports_count: 0, report_coverage: 0 };
  const incident = incidentFrom(processReport("rep-0231"));
  const result = calculateWardSilenceScore(
    active,
    BENGALURU_WARD_ZONES,
    [incident],
    "2022-09-04T06:00:00Z"
  );
  assert.ok(result.score >= 0.6, `Score ${result.score} should cross threshold`);
  assert.strictEqual(result.isFlaggedSilent, true);
  assert.ok(
    result.reasons.some((reason) => reason.includes("Dynamic Infrastructure Event"))
  );
  assert.ok(result.breakdown.connectivity_gap_term >= 0.18);
});

it("Case (b): Kogilu is flagged once reports fall short of its exposure", () => {
  const ward = BENGALURU_WARD_ZONES.find((zone) => zone.id === "zone-yelahanka")!;
  const quiet = { ...ward, actual_reports_count: 1, report_coverage: 0.05 };
  const incident = incidentFrom(processReport("rep-0189"));
  const result = calculateWardSilenceScore(
    quiet,
    BENGALURU_WARD_ZONES,
    [incident],
    "2022-09-03T06:00:00Z"
  );
  assert.ok(result.score >= 0.6, `Score ${result.score} should cross threshold`);
  assert.strictEqual(result.isFlaggedSilent, true);
  assert.ok(result.reasons.some((reason) => reason.includes("report deficit")));
});

it("Case (c) connectivity collapse precedes the first zone-north report", () => {
  const firstNorthReport = rawById("rep-0231");
  const zoneNorth = BENGALURU_WARD_ZONES.find((zone) => zone.id === "zone-north")!;
  const override = (zoneNorth.connectivity_overrides || [])[0];
  assert.ok(override, "zone-north needs a dynamic connectivity override");
  assert.ok(
    Date.parse(override.after) < Date.parse(firstNorthReport.timestamp),
    "The blackout must be modelled before the first report arrives"
  );
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
