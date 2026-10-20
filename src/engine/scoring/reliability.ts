import { Incident, SourceType } from "../types";

export interface ReliabilityResult {
  score: number; // 0 - 100
  pros: string[];
  cons: string[];
  isVerifyUrgently: boolean;
  verifyReason?: string;
  suggestedVerification?: string;
}

/**
 * Calculates deterministic incident reliability score (0-100) with plain-language explanations.
 * Automatically flags "VERIFY URGENTLY" for severe life risks with low reliability.
 */
export function calculateReliability(incident: Incident): ReliabilityResult {
  let score = 50; // Baseline
  const pros: string[] = [];
  const cons: string[] = [];

  // 1. Source Types & Independent Channels
  const hasOfficial = incident.source_types.includes("official");
  const hasSensor = incident.source_types.includes("sensor");
  const hasVolunteer = incident.source_types.includes("volunteer");
  const hasFirstHand = incident.source_types.includes("first_hand");
  const isOnlySecondHand =
    incident.source_types.length === 1 && incident.source_types[0] === "second_hand";

  if (hasOfficial) {
    score += 35;
    pros.push("Confirmed by official disaster agency (NDMA / SDRF / Military)");
  } else if (hasSensor) {
    score += 30;
    pros.push("Direct telemetry from calibrated physical depth/flood sensor");
  } else if (hasVolunteer) {
    score += 25;
    pros.push("Verified on-ground by registered field volunteer");
  } else if (hasFirstHand) {
    score += 15;
    pros.push("First-hand eyewitness account from on-site survivor");
  }

  if (isOnlySecondHand && incident.distinct_reporters_count <= 1) {
    score -= 20;
    cons.push("Single unconfirmed second-hand hearsay report");
  }

  // 2. Multiple Independent Reporters & Multi-Channel corroboration
  if (incident.distinct_reporters_count >= 3) {
    score += 20;
    pros.push(`Corroborated by ${incident.distinct_reporters_count} independent reports`);
  } else if (incident.distinct_reporters_count === 2) {
    score += 10;
    pros.push("Corroborated across 2 separate independent reports");
  }

  if (incident.channels.length >= 2) {
    score += 10;
    pros.push(`Cross-validated across multiple channels (${incident.channels.join(", ")})`);
  }

  // 3. Specific Checkable Details
  let specificDetailCount = 0;
  if (incident.location.landmark_name) specificDetailCount++;
  if (incident.water_level_cm !== null) specificDetailCount++;
  if (incident.people_count_display !== "Unknown") specificDetailCount++;

  if (specificDetailCount >= 2) {
    score += 10;
    pros.push("Provides specific checkable details (named landmark anchor, numeric count/depth)");
  }

  // 4. Uncertainty Radius Penalty
  if (incident.location.uncertainty_radius_m > 250) {
    score -= 15;
    cons.push(`Broad location uncertainty (radius ±${incident.location.uncertainty_radius_m}m)`);
  }

  // Clamp score between 5 and 99 (never 0 or 100 unless official sensor)
  score = Math.max(10, Math.min(99, score));

  // 5. "VERIFY URGENTLY" Logic
  // If life_risk is present but reliability is low, NEVER bury the report — highlight it!
  const hasSevereLifeRisk =
    incident.life_risk === "trapped" ||
    incident.life_risk === "injured" ||
    incident.life_risk === "unconscious" ||
    incident.life_risk === "medically_dependent";

  const isVerifyUrgently = hasSevereLifeRisk && score < 60;
  let verifyReason: string | undefined;
  let suggestedVerification: string | undefined;

  if (isVerifyUrgently) {
    verifyReason = `Severe life risk reported (${incident.life_risk}), but report is single-source or unverified (${score}/100). Do NOT dismiss — verify urgently!`;
    if (incident.channels.includes("call_transcript") || incident.channels.includes("sms")) {
      suggestedVerification = "Immediate telephone call-back to reporter + dispatch nearest volunteer";
    } else {
      suggestedVerification = "Dispatch nearby drone recon or police patrol boat to confirm situation";
    }
  }

  return {
    score,
    pros,
    cons,
    isVerifyUrgently,
    verifyReason,
    suggestedVerification,
  };
}
