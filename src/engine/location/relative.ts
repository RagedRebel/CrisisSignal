import { Coordinates } from "../types";

export interface RelativeShift {
  deltaLat: number;
  deltaLng: number;
  addedUncertaintyM: number;
  directionName: string;
}

/**
 * Parses directional and proximity phrases and applies calibrated offset.
 * 1 degree latitude ~= 111,000 meters.
 * 100 meters ~= 0.0009 degrees.
 */
export function parseRelativeOffset(qualifierText: string): RelativeShift {
  const lower = qualifierText.toLowerCase();

  // Behind / north side
  if (/\b(behind|north|northern|uttar|hinde)\b/i.test(lower)) {
    return {
      deltaLat: 0.0018, // ~200 meters North
      deltaLng: 0.0,
      addedUncertaintyM: 100,
      directionName: "North / Behind",
    };
  }

  // South side / across south
  if (/\b(south|dakshin|southern)\b/i.test(lower)) {
    return {
      deltaLat: -0.0018, // ~200 meters South
      deltaLng: 0.0,
      addedUncertaintyM: 100,
      directionName: "South",
    };
  }

  // Across the river / east side
  if (/\b(across the river|east|eastern|across|purva)\b/i.test(lower)) {
    return {
      deltaLat: 0.0,
      deltaLng: 0.0022, // ~240 meters East
      addedUncertaintyM: 150,
      directionName: "East / Across River",
    };
  }

  // West side
  if (/\b(west|western|paschim)\b/i.test(lower)) {
    return {
      deltaLat: 0.0,
      deltaLng: -0.0022,
      addedUncertaintyM: 150,
      directionName: "West",
    };
  }

  // Immediate vicinity / near / pakka
  if (/\b(near|pakka|samip|close to|around|chowk|gate|outside)\b/i.test(lower)) {
    return {
      deltaLat: 0.0006, // ~70m minor scatter
      deltaLng: 0.0006,
      addedUncertaintyM: 80,
      directionName: "Near / Immediate Vicinity",
    };
  }

  // Default: generic proximity
  return {
    deltaLat: 0,
    deltaLng: 0,
    addedUncertaintyM: 50,
    directionName: "Proximity",
  };
}
