import { WardZone, Incident } from "../types";

function districtsMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  if (!left || !right) return false;
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export interface SilenceCalculationResult {
  score: number;
  breakdown: {
    exposure_term: number;
    vulnerability_term: number;
    connectivity_gap_term: number;
    coverage_deficit_term: number;
    neighbor_signal: number;
    went_quiet_signal: number;
  };
  isFlaggedSilent: boolean;
  reasons: string[];
  suggestedAction: string;
}

/**
 * Calculates Silence Layer metric for each ward zone.
 * Uncovers quiet zones that are probably in trouble due to digital divide or infrastructure collapse.
 */
export function calculateWardSilenceScore(
  ward: WardZone,
  allWards: WardZone[],
  allIncidents: Incident[],
  currentSimulatedTime: string,
  threshold = 0.60
): SilenceCalculationResult {
  const reasons: string[] = [];

  // 1. Core formula terms with dynamic time-varying connectivity
  let currentConnectivity = ward.connectivity_index;
  let overrideActive = false;
  if (ward.connectivity_overrides && ward.connectivity_overrides.length > 0) {
    const currTimeMs = new Date(currentSimulatedTime).getTime();
    for (const ov of ward.connectivity_overrides) {
      if (currTimeMs >= new Date(ov.after).getTime()) {
        currentConnectivity = ov.new_value;
        overrideActive = true;
        reasons.push(
          `Dynamic Infrastructure Event: Connectivity collapsed to ${Math.round(ov.new_value * 100)}% due to ${ov.reason}.`
        );
      }
    }
  }

  // Calibration guard: high exposure and a digital divide are permanent
  // characteristics, not evidence that a flood is happening. Until the zone
  // itself (or its district) shows a flood signal, silence is just normal
  // quiet and must not be flagged. This prevents day-zero false positives.
  const nonSensorIncidents = allIncidents.filter(
    (incident) => incident.channels.some((channel) => channel !== "sensor")
  );
  const wardHasIncident = nonSensorIncidents.some(
    (incident) => incident.location.ward_id === ward.id
  );
  const districtHasIncident = nonSensorIncidents.some((incident) =>
    districtsMatch(incident.location.district, ward.district)
  );
  const floodContextActive =
    ward.actual_reports_count > 0 || wardHasIncident || districtHasIncident || overrideActive;

  if (!floodContextActive) {
    return {
      score: 0,
      breakdown: {
        exposure_term: 0,
        vulnerability_term: 0,
        connectivity_gap_term: 0,
        coverage_deficit_term: 0,
        neighbor_signal: 0,
        went_quiet_signal: 0,
      },
      isFlaggedSilent: false,
      reasons: [
        "No flood reports, district incidents, or infrastructure outage reported here yet; monitoring only.",
      ],
      suggestedAction: ward.suggested_welfare_check,
    };
  }

  const exposure_term = 0.30 * ward.flood_exposure;
  const vulnerability_term = 0.25 * ward.vulnerability_index;
  const connectivity_gap = 1.0 - currentConnectivity;
  const connectivity_gap_term = 0.20 * connectivity_gap;

  // Actual coverage deficit (1 - coverage)
  const coverage_deficit = Math.max(0, 1.0 - ward.report_coverage);
  const coverage_deficit_term = 0.25 * coverage_deficit;

  if (ward.flood_exposure >= 0.8) {
    reasons.push(`High physical flood exposure (${Math.round(ward.flood_exposure * 100)}%) along river/canal spillway.`);
  }
  if (ward.vulnerability_index >= 0.7) {
    reasons.push(`High demographic vulnerability (${Math.round(ward.vulnerability_index * 100)}%): kutcha housing & elder population.`);
  }
  if (connectivity_gap >= 0.6) {
    reasons.push(`Severe digital divide: ${(connectivity_gap * 100).toFixed(0)}% connectivity gap.`);
  }
  if (coverage_deficit >= 0.7) {
    reasons.push(`Severe report deficit: only ${ward.actual_reports_count} of ${ward.expected_reports_count} expected reports received.`);
  }

  // 2. Neighbor Signal (up to +0.15)
  // When adjacent zones are heavily flooded or actively reporting, but this zone is quiet
  let neighbor_signal = 0.0;
  const adjacentWards = allWards.filter((w) => ward.adjacent_ward_ids.includes(w.id));
  const activeNeighborIncidents = adjacentWards.reduce((sum, w) => sum + w.actual_reports_count, 0);

  if (activeNeighborIncidents >= 8 && ward.actual_reports_count <= 2) {
    neighbor_signal = 0.15;
    reasons.push(
      `Neighbor anomaly (+0.15): Surrounding wards received ${activeNeighborIncidents} flood reports, but this zone has only ${ward.actual_reports_count}.`
    );
  } else if (activeNeighborIncidents >= 4 && ward.actual_reports_count <= 1) {
    neighbor_signal = 0.08;
    reasons.push(`Adjacent wards reporting active flooding while this ward remains quiet (+0.08).`);
  }

  // 3. Went-Quiet Signal (up to +0.15)
  // When a zone was actively reporting and then abruptly ceased reporting during
  // an active flood. The signal is bounded: after several hours without a new
  // report, a zone is simply stale (or the flood has receded), not "newly
  // quiet". Without the upper bound, every zone that ever reported is flagged
  // at the end of a multi-day replay.
  let went_quiet_signal = 0.0;
  if (ward.last_report_timestamp) {
    const lastTime = new Date(ward.last_report_timestamp).getTime();
    const currTime = new Date(currentSimulatedTime).getTime();
    const minutesSinceLast = (currTime - lastTime) / (1000 * 60);
    const WENT_QUIET_MIN_MINUTES = 60;
    const WENT_QUIET_MAX_MINUTES = 360; // six hours

    // If it had at least 2 reports earlier, but nothing in the last 1-6 hours.
    if (
      ward.actual_reports_count >= 2 &&
      minutesSinceLast >= WENT_QUIET_MIN_MINUTES &&
      minutesSinceLast <= WENT_QUIET_MAX_MINUTES
    ) {
      went_quiet_signal = 0.15;
      reasons.push(
        `Went-Quiet Signal (+0.15): Ward was reporting earlier, but has been silent for ${Math.round(minutesSinceLast)} minutes during an active flood (possible power blackout or cell tower submersion).`
      );
    }
  }

  // Total clamped to 0.0 - 1.0
  const rawTotal =
    exposure_term +
    vulnerability_term +
    connectivity_gap_term +
    coverage_deficit_term +
    neighbor_signal +
    went_quiet_signal;

  const score = Math.min(1.0, Math.max(0.0, Math.round(rawTotal * 1000) / 1000));
  const isFlaggedSilent = score >= threshold;

  return {
    score,
    breakdown: {
      exposure_term: Math.round(exposure_term * 1000) / 1000,
      vulnerability_term: Math.round(vulnerability_term * 1000) / 1000,
      connectivity_gap_term: Math.round(connectivity_gap_term * 1000) / 1000,
      coverage_deficit_term: Math.round(coverage_deficit_term * 1000) / 1000,
      neighbor_signal,
      went_quiet_signal,
    },
    isFlaggedSilent,
    reasons,
    suggestedAction: ward.suggested_welfare_check,
  };
}
