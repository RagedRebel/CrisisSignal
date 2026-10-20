import { GroundTruthSilentZone, LifeRisk, VulnerableGroup } from "../engine/types";
import {
  BENGALURU_GROUND_TRUTH,
  BENGALURU_RAW_EVENTS,
  BENGALURU_WARD_ZONES,
  BackboneEvent,
} from "./bengaluru";

/* ------------------------------------------------------------------ *
 *  Ground truth for the simulated Bengaluru flood replay.
 *
 *  Everything here is derived from `groundtruth.json` (the journalist
 *  backbone) and the hidden `_gt_backbone_id` links on the generated
 *  reports. It is imported by the evaluator and the benchmark overlay
 *  only — the engine itself never reads these values.
 * ------------------------------------------------------------------ */

export interface GroundTruthIncidentGroup {
  id: string;
  name: string;
  report_ids: string[];
  planted_case?: "a" | "b" | "c" | "d" | "e" | "f";
  true_priority_rank: number; // 1 = highest true urgency
  true_life_risk: LifeRisk;
  true_people_count: { min: number; max: number };
  true_vulnerable_groups: VulnerableGroup[];
  is_false_alarm: boolean;
  notes: string;
}

function numeric(value: number | { min: number; max: number } | "Unknown"): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") return Math.round((value.min + value.max) / 2);
  return 0;
}

function lifeRiskFor(event: BackboneEvent): LifeRisk {
  switch (event.event_type) {
    case "breach":
    case "flood_surge":
    case "bridge_failure":
    case "landslide":
    case "erosion":
      return "trapped";
    case "rescue":
    case "death":
      return "injured";
    case "relief_camp":
    case "evacuation":
    case "dam_release":
      return "none_stated";
    default:
      return "none_stated";
  }
}

/**
 * Seedless urgency score used only to order the *true* backbone events.
 * It is deliberately conservative: physical isolation, loss of life and
 * infrastructure failure dominate raw report volume (which the engine
 * never sees as ground truth).
 */
function trueSeverity(event: BackboneEvent): number {
  let score = 0;
  switch (event.event_type) {
    case "bridge_failure":
      score += 25;
      break;
    case "breach":
      score += 20;
      break;
    case "flood_surge":
      score += 15;
      break;
    case "rescue":
      score += 12;
      break;
    case "death":
      score += 20;
      break;
    case "relief_camp":
      score += 5;
      break;
    default:
      score += 8;
  }
  if (event.access_status === "cut_off") score += 30;
  else if (event.access_status === "boat_only") score += 25;

  if (typeof event.deaths === "number") score += Math.min(20, event.deaths * 20);
  const villages = numeric(event.villages_affected);
  score += Math.min(20, villages / 2);
  return score;
}

function describeEvent(event: BackboneEvent): string {
  const place = event.location.sub_location || event.location.district;
  const type = event.event_type.replace(/_/g, " ");
  return `${type[0].toUpperCase()}${type.slice(1)} — ${place} (${event.location.district})`;
}

const reportsByBackbone: Record<string, string[]> = {};
for (const report of BENGALURU_RAW_EVENTS) {
  if (!report._gt_backbone_id) continue;
  (reportsByBackbone[report._gt_backbone_id] ||= []).push(report.id);
}

const rankedBackbone = [...BENGALURU_GROUND_TRUTH.backbone_true_events]
  .map((event, index) => ({
    event,
    index,
    severity: trueSeverity(event),
    at: Date.parse(event.event_at) || 0,
  }))
  .sort((a, b) => b.severity - a.severity || a.at - b.at || a.index - b.index);

const rankByBackbone: Record<string, number> = {};
rankedBackbone.forEach((entry, index) => {
  rankByBackbone[entry.event.id] = index + 1;
});

const plantCaseByBackbone: Record<string, GroundTruthIncidentGroup["planted_case"]> = {
  [BENGALURU_GROUND_TRUTH.benchmark_cases.case_a.backbone_id]: "a",
  [BENGALURU_GROUND_TRUTH.benchmark_cases.case_b.backbone_id]: "b",
  [BENGALURU_GROUND_TRUTH.benchmark_cases.case_c.backbone_id]: "c",
  [BENGALURU_GROUND_TRUTH.benchmark_cases.case_d.backbone_id]: "d",
  [BENGALURU_GROUND_TRUTH.benchmark_cases.case_e.backbone_id]: "e",
  [BENGALURU_GROUND_TRUTH.benchmark_cases.case_f.backbone_id]: "f",
};

export const GROUND_TRUTH_INCIDENTS: GroundTruthIncidentGroup[] =
  BENGALURU_GROUND_TRUTH.backbone_true_events.map((event) => {
    const people = numeric(event.people_affected);
    return {
      id: event.id,
      name: describeEvent(event),
      report_ids: reportsByBackbone[event.id] || [],
      planted_case: plantCaseByBackbone[event.id],
      true_priority_rank: rankByBackbone[event.id] || 99,
      true_life_risk: lifeRiskFor(event),
      true_people_count: { min: people, max: people },
      true_vulnerable_groups:
        event.event_type === "flood_surge" ||
        event.event_type === "breach" ||
        event.event_type === "bridge_failure"
          ? ["elderly", "children"]
          : [],
      is_false_alarm: false,
      notes: event.evidence_phrase,
    };
  });

/** Lookup from a report id to its true backbone incident group. */
export const GROUND_TRUTH_BY_REPORT: Record<string, GroundTruthIncidentGroup> = {};
for (const group of GROUND_TRUTH_INCIDENTS) {
  for (const reportId of group.report_ids) {
    GROUND_TRUTH_BY_REPORT[reportId] = group;
  }
}

const zoneNameById = new Map(BENGALURU_WARD_ZONES.map((zone) => [zone.id, zone.name]));

export const GROUND_TRUTH_SILENT_ZONES: GroundTruthSilentZone[] =
  BENGALURU_GROUND_TRUTH.silent_zones.map((zone) => ({
    ward_id: zone.zone_id,
    ward_name: zoneNameById.get(zone.zone_id) || zone.district,
    truly_in_distress: true,
    failure_mode: zone.failure_mode,
    onset_time: zone.onset_time,
    expected_silence_score: zone.expected_silence_score,
    actual_incident_description: zone.reason,
    is_true_emergency: true,
  }));

/**
 * Named benchmark cases, mapped onto the real backbone where the replay
 * actually exhibits the behaviour (rather than a fictional planted story).
 */
export const GROUND_TRUTH_PLANTED_CASES = {
  case_a: {
    letter: "a",
    name: "Loud ORR Commuter Corridor",
    description:
      "The ORR IT corridor produces a flood of ankle-to-knee waterlogging chatter while the slower, deeper trouble at Kadubeesanahalli surfaces one message at a time.",
    expected_outcome:
      "Report volume must not equal urgency: severity, exposure and depth keep the serious stretch visible above loud shallow chatter.",
  },
  case_b: {
    letter: "b",
    name: "Kogilu Layout Isolation (Equity Core)",
    description:
      "Kogilu Cross low-income layouts flood after a choked storm drain, but only a thin trickle of messages reaches the control room.",
    expected_outcome:
      "Silence score climbs, the zone turns purple, and a welfare check is suggested even without loud reporting.",
  },
  case_c: {
    letter: "c",
    name: "Jakkur Culvert Collapse Blackout",
    description:
      "The Kogilu-Thanisandra culvert collapse severs the fibre backbone and tower power to the Thanisandra-Jakkur belt on 4 Sep.",
    expected_outcome:
      "Time-varying connectivity drops to 8%, the silence score jumps above threshold, and the flag precedes any confirming bulletin.",
  },
  case_d: {
    letter: "d",
    name: "Ejipura Underpass Duplicate Cluster",
    description:
      "Dozens of near-identical citizen reports describe the Ejipura junction underpass filling within minutes on 2 Sep.",
    expected_outcome: "Reports fold into a single consolidated underpass-flooding incident.",
  },
  case_e: {
    letter: "e",
    name: "Lethal Hazard Kept Separate",
    description:
      "A sparking transformer at the Kempapura substation is reported alongside ordinary Hebbal lake-bund waterlogging.",
    expected_outcome: "Safety guardrails keep lethal electrical-hazard incidents distinct.",
  },
  case_f: {
    letter: "f",
    name: "Viral Dam-Release Rumour",
    description:
      "Copy-pasted posts claim KRS dam gates opened without a siren and a 10ft water wall is 20 minutes from MG Road.",
    expected_outcome:
      "Recycled text is detected, the rumour is de-duplicated, and reliability drops until an official source confirms.",
  },
} as const;
