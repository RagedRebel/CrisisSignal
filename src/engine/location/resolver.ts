import { ExtractedReport, ResolvedLocation, Coordinates } from "../types";
import { matchGazetteer } from "./gazetteer";
import { parseRelativeOffset } from "./relative";
import { calculateDistanceMeters } from "../merger/spatial";
import { BENGALURU_CITY } from "../../data/city";
import { BENGALURU_WARD_ZONES } from "../../data/bengaluru";

export const BENGALURU_DISTRICT_NAMES = [
  "Central Bengaluru",
  "East Bengaluru",
  "South East Bengaluru",
  "Bommanahalli",
  "South Bengaluru",
  "West Bengaluru",
  "North Bengaluru",
  "Yelahanka",
  "Mahadevapura",
];

/**
 * Returns the zone whose district name appears in the text, preferring the
 * last mention. Overlapping names ("South East Bengaluru" vs "East Bengaluru")
 * are resolved by preferring the longest overlap in the chosen mention.
 */
export function detectDistrict(text: string): string | null {
  const lower = text.toLowerCase();
  const matches: { district: string; index: number; length: number }[] = [];
  for (const district of BENGALURU_DISTRICT_NAMES) {
    const index = lower.lastIndexOf(district.toLowerCase());
    if (index >= 0) matches.push({ district, index, length: district.length });
  }
  if (matches.length === 0) return null;

  matches.sort((a, b) => b.index - a.index || b.length - a.length);
  const best = matches[0];
  // If a longer district name overlaps this mention (e.g. "South East
  // Bengaluru" containing "East Bengaluru"), prefer the specific name.
  for (const candidate of matches) {
    const overlaps = candidate.index < best.index + best.length && best.index < candidate.index + candidate.length;
    if (overlaps && candidate.length > best.length) return candidate.district;
  }
  return best.district;
}

function zoneForDistrict(district: string | null) {
  if (!district) return null;
  const lower = district.toLowerCase();
  return (
    BENGALURU_WARD_ZONES.find((zone) => (zone.district || "").toLowerCase() === lower) ||
    BENGALURU_WARD_ZONES.find((zone) => zone.name.toLowerCase().includes(lower)) ||
    null
  );
}

function nearestZone(coords: Coordinates) {
  let best: { zone: (typeof BENGALURU_WARD_ZONES)[number]; distance: number } | null = null;
  for (const zone of BENGALURU_WARD_ZONES) {
    const distance = calculateDistanceMeters(coords, zone.center);
    if (!best || distance < best.distance) best = { zone, distance };
  }
  return best;
}

export interface ResolveLocationOptions {
  allowOsmOnline?: boolean;
  /** Exact coordinates supplied by the upstream channel (sensors, bulletins, verified posts). */
  locationHint?: { lat: number; lng: number; name: string };
  /** Hidden district label used by the replay generator to help vague reports land correctly. */
  districtHint?: string;
}

/**
 * Resolves location from structured extraction.
 * Rule: NEVER invent or guess a pin beyond the district-centroid fallback,
 * which is explicitly marked with a wide uncertainty radius.
 */
export function resolveLocation(
  extracted: ExtractedReport,
  rawText: string,
  options?: ResolveLocationOptions
): ResolvedLocation {
  // 0. Channel-supplied coordinates are trusted directly.
  if (options?.locationHint) {
    const coords = { lat: options.locationHint.lat, lng: options.locationHint.lng };
    const nearest = nearestZone(coords);
    return {
      resolved: true,
      coords,
      uncertainty_radius_m: 120,
      landmark_name: options.locationHint.name,
      ward_id: nearest?.zone.id || null,
      district: nearest?.zone.district || null,
      resolution_method: "channel_hint",
      needs_location_lane: false,
      notes: `Coordinates supplied by channel: ${options.locationHint.name}`,
    };
  }

  const query = extracted.location_raw || rawText;

  // 1. Check for empty or vague non-locations
  if (!query || query.trim().length < 3 || /^(paani|bachao|help|water|save us|emergency)$/i.test(query.trim())) {
    return {
      resolved: false,
      coords: null,
      uncertainty_radius_m: 0,
      landmark_name: null,
      ward_id: null,
      resolution_method: "unresolved",
      needs_location_lane: true,
      notes: "No identifiable geographic anchor in message. Coordinator must contact reporter or assign field scout.",
    };
  }

  const district =
    detectDistrict(query) ||
    detectDistrict(rawText) ||
    (options?.districtHint ? detectDistrict(options.districtHint) || null : null);

  // 2. Gazetteer lookup (exact, fuzzy, ward-level), filtered by district when known.
  const match = matchGazetteer(query, { district });

  if (match) {
    const baseCoords: Coordinates = {
      lat: match.landmark.coords.lat,
      lng: match.landmark.coords.lng,
    };

    let uncertainty = match.landmark.default_uncertainty_m;
    let resolutionMethod: ResolvedLocation["resolution_method"] =
      match.matchType === "exact_alias"
        ? "exact_landmark"
        : match.matchType === "ward_zone"
        ? "district_centroid"
        : "fuzzy_landmark";

    let finalCoords = { ...baseCoords };

    // 3. Apply relative spatial qualifier if present (skip for wide ward approximations)
    const qualifier =
      extracted.location_qualifiers ||
      rawText.match(/\b(behind[^\.,;]*|across[^\.,;]*|opposite[^\.,;]*|near[^\.,;]*)/i)?.[0];

    if (qualifier && match.matchType !== "ward_zone") {
      const shift = parseRelativeOffset(qualifier);
      finalCoords.lat += shift.deltaLat;
      finalCoords.lng += shift.deltaLng;
      uncertainty += shift.addedUncertaintyM;
      resolutionMethod = "relative_offset";
    }

    const bbox = BENGALURU_CITY.bbox;
    if (
      finalCoords.lat < bbox.minLat ||
      finalCoords.lat > bbox.maxLat ||
      finalCoords.lng < bbox.minLng ||
      finalCoords.lng > bbox.maxLng
    ) {
      return {
        resolved: false,
        coords: null,
        uncertainty_radius_m: 0,
        landmark_name: match.landmark.name,
        ward_id: match.landmark.ward_id,
        district: district,
        resolution_method: "unresolved",
        needs_location_lane: true,
        notes: "Calculated coordinates fell outside the Bengaluru replay bounding box.",
      };
    }

    const zone = BENGALURU_WARD_ZONES.find((w) => w.id === match.landmark.ward_id);
    return {
      resolved: true,
      coords: finalCoords,
      uncertainty_radius_m: uncertainty,
      landmark_name: match.landmark.name,
      ward_id: match.landmark.ward_id,
      district: zone?.district || district,
      resolution_method: resolutionMethod,
      needs_location_lane: false,
      notes: qualifier ? `Offset applied for relative phrase: "${qualifier}"` : undefined,
    };
  }

  // 4. District centroid fallback for vague reports ("near the flooded river bank, RR Nagar")
  const zone = zoneForDistrict(district);
  if (zone) {
    return {
      resolved: true,
      coords: { ...zone.center },
      uncertainty_radius_m: 12000,
      landmark_name: `${zone.name} (district-level estimate)`,
      ward_id: zone.id,
      district: zone.district || district,
      resolution_method: "district_centroid",
      needs_location_lane: false,
      notes: `No landmark matched; anchored to ${zone.name} centre with a 12 km uncertainty radius.`,
    };
  }

  // 5. Nothing matched: Needs Location lane (never invent a pin).
  return {
    resolved: false,
    coords: null,
    uncertainty_radius_m: 0,
    landmark_name: null,
    ward_id: null,
    district: district,
    resolution_method: "unresolved",
    needs_location_lane: true,
    notes: `Location "${query}" could not be anchored to the Bengaluru gazetteer. Routing to Needs Location queue.`,
  };
}
