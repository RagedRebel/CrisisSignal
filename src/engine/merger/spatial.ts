import { Coordinates } from "../types";

/**
 * Haversine distance in meters between two coordinates.
 */
export function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (coord1.lat * Math.PI) / 180;
  const phi2 = (coord2.lat * Math.PI) / 180;
  const deltaPhi = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLambda = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks if two location uncertainty circles overlap or fall within threshold.
 */
export function areLocationsMergeable(
  locA: { coords: Coordinates | null; uncertainty_radius_m: number },
  locB: { coords: Coordinates | null; uncertainty_radius_m: number },
  baseThresholdM = 300
): { mergeable: boolean; distanceM: number; reason: string } {
  if (!locA.coords || !locB.coords) {
    return { mergeable: false, distanceM: Infinity, reason: "One or both locations unlocated" };
  }

  const distance = calculateDistanceMeters(locA.coords, locB.coords);
  const combinedRadius = locA.uncertainty_radius_m + locB.uncertainty_radius_m;
  const effectiveThreshold = Math.max(baseThresholdM, combinedRadius * 0.7);

  if (distance <= effectiveThreshold) {
    return {
      mergeable: true,
      distanceM: Math.round(distance),
      reason: `Spatial proximity: ${Math.round(distance)}m (within allowed radius ${Math.round(effectiveThreshold)}m)`,
    };
  }

  return {
    mergeable: false,
    distanceM: Math.round(distance),
    reason: `Too far apart: ${Math.round(distance)}m > ${Math.round(effectiveThreshold)}m`,
  };
}
