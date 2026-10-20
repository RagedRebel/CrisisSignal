import { Incident, WardZone, LifeRisk, VulnerableGroup, Hazard, AccessStatus, WaterBand } from "../types";

export interface UrgencyBreakdown {
  life_risk_component: number;
  vulnerability_component: number;
  hazard_component: number;
  time_waiting_component: number;
  access_component: number;
  reliability_component: number;
  fairness_boost: number;
  total: number;
}

export interface UrgencyCalculationResult {
  score: number; // 0.0 - 1.0
  breakdown: UrgencyBreakdown;
  fairness_boost_applied: boolean;
  fairness_boost_reason?: string;
  factor_details: {
    life_risk_val: number;
    vulnerability_val: number;
    hazard_val: number;
    time_waiting_val: number;
    access_val: number;
    reliability_val: number;
  };
}

export interface UrgencyWeights {
  life_risk: number;       // default 0.30
  vulnerable_groups: number; // default 0.20
  hazard_severity: number; // default 0.15
  time_waiting: number;    // default 0.15
  access_difficulty: number; // default 0.10
  report_reliability: number; // default 0.10
}

export const DEFAULT_WEIGHTS: UrgencyWeights = {
  life_risk: 0.30,
  vulnerable_groups: 0.20,
  hazard_severity: 0.15,
  time_waiting: 0.15,
  access_difficulty: 0.10,
  report_reliability: 0.10,
};

/**
 * Calculates deterministic Urgency Score for an incident with Explainable breakdown.
 */
export function calculateUrgency(
  incident: Incident,
  ward: WardZone | undefined,
  currentSimulatedTime: string,
  weights: UrgencyWeights = DEFAULT_WEIGHTS
): UrgencyCalculationResult {
  // 1. Life Risk Factor (0 - 1.0)
  let baseLifeRiskVal = 0.0;
  switch (incident.life_risk) {
    case "unconscious":
      baseLifeRiskVal = 1.0;
      break;
    case "medically_dependent":
      baseLifeRiskVal = 0.95;
      break;
    case "trapped":
      baseLifeRiskVal = 0.85;
      break;
    case "injured":
      baseLifeRiskVal = 0.75;
      break;
    case "none_stated":
    default:
      baseLifeRiskVal = 0.05;
      break;
  }

  // Scale by people count if present. A log curve keeps small groups distinct
  // instead of instantly saturating the 1.0 cap when more than ~10 people are
  // mentioned.
  const maxPeople = Math.max(0, incident.people_count_range.max);
  const peopleScale =
    maxPeople > 0 ? Math.min(1.0, Math.log10(1 + maxPeople) / 2.5) : 0;
  const life_risk_val = Math.min(1.0, baseLifeRiskVal * (0.62 + 0.38 * peopleScale));

  // 2. Vulnerable Groups & Ward Baseline (0 - 1.0)
  // Each group adds 0.25; blended with ward demographic vulnerability index
  const groupScore = Math.min(1.0, incident.vulnerable_groups.length * 0.3);
  const wardVuln = ward ? ward.vulnerability_index : 0.4;
  const vulnerability_val = Math.min(1.0, groupScore * 0.6 + wardVuln * 0.4);

  // 3. Hazard Severity (0 - 1.0)
  let hazard_val = 0.1;
  // Water band
  if (incident.water_band === "above_head") hazard_val += 0.45;
  else if (incident.water_band === "chest") hazard_val += 0.35;
  else if (incident.water_band === "waist") hazard_val += 0.25;
  else if (incident.water_band === "knee") hazard_val += 0.12;
  else if (incident.water_band === "ankle") hazard_val += 0.04;

  // Rising trend
  if (incident.water_trend === "rising") hazard_val += 0.2;

  // Hazards (electrical, collapse, current)
  for (const h of incident.hazards) {
    if (h === "electrical") hazard_val += 0.35;
    if (h === "current") hazard_val += 0.25;
    if (h === "collapse") hazard_val += 0.3;
  }
  hazard_val = Math.min(1.0, hazard_val);

  // 4. Time Waiting (Saturating exponential curve: 0 to 1 over 120 mins)
  const firstReportTime = new Date(incident.created_at).getTime();
  const nowTime = new Date(currentSimulatedTime).getTime();
  const minutesWaiting = Math.max(0, (nowTime - firstReportTime) / (1000 * 60));
  // 1 - exp(-minutes / 60)
  const time_waiting_val = Math.min(1.0, 1 - Math.exp(-minutesWaiting / 60));

  // 5. Access Difficulty (0 - 1.0)
  let access_val = 0.1;
  if (incident.access_status === "boat_needed") access_val = 0.95;
  else if (incident.access_status === "road_cut") access_val = 0.85;
  else if (incident.access_status === "blocked") access_val = 0.55;
  else if (incident.access_status === "ok") access_val = 0.1;

  // 6. Report Reliability (0 - 1.0)
  const reliability_val = incident.reliability_score / 100;

  // Weighted Sum
  const life_risk_comp = life_risk_val * weights.life_risk;
  const vuln_comp = vulnerability_val * weights.vulnerable_groups;
  const hazard_comp = hazard_val * weights.hazard_severity;
  const time_comp = time_waiting_val * weights.time_waiting;
  const access_comp = access_val * weights.access_difficulty;
  const rel_comp = reliability_val * weights.report_reliability;

  const baseUrgency = life_risk_comp + vuln_comp + hazard_comp + time_comp + access_comp + rel_comp;

  // 7. Equity Focus: Fairness Boost (capped at 0.10)
  // Formula: FairnessBoost = min(0.10, 0.10 * connectivity_gap * (1 - report_coverage))
  let fairness_boost = 0.0;
  let fairness_boost_applied = false;
  let fairness_boost_reason: string | undefined;

  if (ward) {
    const connectivity_gap = 1.0 - ward.connectivity_index; // e.g. 0.70 in Yelahanka, 0.92 in Thanisandra after the culvert collapse
    const coverage = ward.report_coverage; // 0 to 1
    const unservedDeficit = Math.max(0, 1.0 - coverage);
    const silenceFlagged = Boolean(ward.is_flagged_silent);
    // The Silence Layer can flag a ward even when a handful of reports arrived
    // (coverage looks fine on paper) because the zone is cut off. Those reports
    // still deserve the equity boost.
    const effectiveDeficit = silenceFlagged ? Math.max(unservedDeficit, 0.3) : unservedDeficit;

    if (connectivity_gap > 0.4 && (unservedDeficit > 0.3 || silenceFlagged)) {
      fairness_boost = Math.min(0.10, 0.10 * connectivity_gap * effectiveDeficit);
      fairness_boost = Math.round(fairness_boost * 1000) / 1000;

      if (fairness_boost > 0.01) {
        fairness_boost_applied = true;
        fairness_boost_reason =
          silenceFlagged && coverage >= 0.7
            ? `+${(fairness_boost * 100).toFixed(1)}% Fairness Boost: Ward "${ward.name}" is flagged by the Silence Layer with a ${(connectivity_gap * 100).toFixed(0)}% connectivity gap. Reports from a cut-off zone understate the need on the ground.`
            : `+${(fairness_boost * 100).toFixed(1)}% Fairness Boost: Ward "${ward.name}" has severe connectivity gap (${(connectivity_gap * 100).toFixed(0)}%) and low reporting coverage (${(coverage * 100).toFixed(0)}%). Few reports is lack of connectivity, not lack of danger.`;
      }
    }
  }

  const totalScore = Math.min(1.0, Math.max(0.05, baseUrgency + fairness_boost));

  return {
    score: totalScore,
    breakdown: {
      life_risk_component: Math.round(life_risk_comp * 1000) / 1000,
      vulnerability_component: Math.round(vuln_comp * 1000) / 1000,
      hazard_component: Math.round(hazard_comp * 1000) / 1000,
      time_waiting_component: Math.round(time_comp * 1000) / 1000,
      access_component: Math.round(access_comp * 1000) / 1000,
      reliability_component: Math.round(rel_comp * 1000) / 1000,
      fairness_boost,
      total: Math.round(totalScore * 1000) / 1000,
    },
    fairness_boost_applied,
    fairness_boost_reason,
    factor_details: {
      life_risk_val,
      vulnerability_val,
      hazard_val,
      time_waiting_val,
      access_val,
      reliability_val,
    },
  };
}
