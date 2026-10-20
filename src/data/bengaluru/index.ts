import eventsData from "./events.json";
import zonesData from "./zones.json";
import gazetteerData from "./gazetteer.json";
import groundtruthData from "./groundtruth.json";
import officialData from "./official.json";
import sensorsData from "./sensors.json";
import socialData from "./social.json";
import reconstructedData from "./reconstructed_reports.json";
import { RawReport, WardZone } from "@/engine/types";

/* ------------------------------------------------------------------ *
 *  Simulated Bengaluru flood replay (22 Aug – 7 Sep 2022) — typed
 *  loaders for the generated JSON datasets.
 *
 *  Every incident message, bulletin and social post here is synthetic.
 *  The geography and the flood dates follow the real Bengaluru monsoon
 *  of 2022, but no real person, handle or telemetry reading is used.
 *  Everything the app renders is pre-built offline; no network calls.
 * ------------------------------------------------------------------ */

export interface BengaluruZoneDefinition {
  id: string;
  name: string;
  district: string;
  code: string;
  population: number;
  area_sq_km: number;
  center: { lat: number; lng: number };
  polygon: { lat: number; lng: number }[];
  vulnerability_index: number;
  base_connectivity: number;
  connectivity_overrides: {
    after: string;
    new_value: number;
    reason: string;
  }[];
  population_density: number;
  has_hospital: boolean;
  has_relief_camp: boolean;
  notes: string;
}

export interface BengaluruGazetteerEntry {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  zone_id: string;
  district: string;
  location: { lat: number; lng: number };
}

export interface BackboneEvent {
  id: string;
  event_at: string;
  event_at_precision: "day" | "hour" | "minute";
  location: {
    district: string;
    sub_location?: string;
    lat?: number;
    lng?: number;
  };
  event_type: string;
  people_affected: number | { min: number; max: number } | "Unknown";
  deaths: number | "Unknown";
  villages_affected: number | "Unknown";
  access_status: string;
  outlet: string;
  url: string;
  evidence_phrase: string;
}

export type BenchmarkCaseLetter = "case_a" | "case_b" | "case_c" | "case_d" | "case_e" | "case_f";

export interface BenchmarkCaseDefinition {
  backbone_id: string;
  zone_id: string;
  zone_name: string;
}

export interface SilentZoneDefinition {
  zone_id: string;
  district: string;
  onset_time: string;
  reason: string;
  expected_silence_score: number;
  failure_mode: string;
}

export interface OfficialWorstHitEntry {
  district: string;
  peak_affected: number;
  rank: number;
  note: string;
}

export interface BengaluruGroundTruthData {
  scenario_title: string;
  backbone_true_events: BackboneEvent[];
  benchmark_cases: Record<BenchmarkCaseLetter, BenchmarkCaseDefinition>;
  official_worst_hit_districts: OfficialWorstHitEntry[];
  silent_zones: SilentZoneDefinition[];
}

/* ------------------------------------------------------------------ *
 *  Ward zones — JSON polygons become the WardZone runtime shape.
 * ------------------------------------------------------------------ */

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = (a.lat - b.lat) * 111.32;
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

const zoneDefinitions = zonesData as BengaluruZoneDefinition[];

/** Three nearest zones become the neighbour list used by the silence layer. */
function adjacentZoneIds(zone: BengaluruZoneDefinition): string[] {
  return zoneDefinitions
    .filter((candidate) => candidate.id !== zone.id)
    .map((candidate) => ({ id: candidate.id, distance: distanceKm(zone.center, candidate.center) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((entry) => entry.id);
}

export const BENGALURU_WARD_ZONES: WardZone[] = zoneDefinitions.map((zone) => ({
  id: zone.id,
  name: zone.name,
  code: zone.code,
  population: zone.population,
  area_sq_km: zone.area_sq_km,
  boundary_polygon: zone.polygon.map((point) => [point.lat, point.lng] as [number, number]),
  center: { ...zone.center },
  district: zone.district,
  // Physical exposure tracks the terrain/vulnerability profile of each valley;
  // it stays a static characteristic of the zone, not a live flood signal.
  flood_exposure: Math.min(1, zone.vulnerability_index * 0.9 + 0.05),
  vulnerability_index: zone.vulnerability_index,
  connectivity_index: zone.base_connectivity,
  base_connectivity: zone.base_connectivity,
  connectivity_outage: false,
  connectivity_overrides: (zone.connectivity_overrides || []).map((override) => ({ ...override })),
  actual_reports_count: 0,
  expected_reports_count: Math.max(5, Math.round(zone.population / 95000)),
  report_coverage: 0,
  active_incidents_count: 0,
  last_report_timestamp: null,
  went_quiet_detected: false,
  adjacent_ward_ids: adjacentZoneIds(zone),
  silence_score: 0,
  silence_breakdown: {
    exposure_term: 0,
    vulnerability_term: 0,
    connectivity_gap_term: 0,
    coverage_deficit_term: 0,
    neighbor_signal: 0,
    went_quiet_signal: 0,
  },
  is_flagged_silent: false,
  silence_reasons: [],
  suggested_welfare_check: `Call the ${zone.name} ward desk and dispatch a volunteer welfare check.`,
  silence_flagged_at: null,
}));

/* ------------------------------------------------------------------ *
 *  Event streams.
 * ------------------------------------------------------------------ */

export const BENGALURU_GAZETTEER: BengaluruGazetteerEntry[] =
  gazetteerData as BengaluruGazetteerEntry[];

export const BENGALURU_GROUND_TRUTH: BengaluruGroundTruthData =
  groundtruthData as BengaluruGroundTruthData;

export const BENGALURU_RAW_EVENTS: RawReport[] = eventsData as unknown as RawReport[];
export const BENGALURU_RECONSTRUCTED: RawReport[] =
  reconstructedData as unknown as RawReport[];
export const BENGALURU_SENSORS: RawReport[] = sensorsData as unknown as RawReport[];
export const BENGALURU_OFFICIAL: RawReport[] = officialData as unknown as RawReport[];
export const BENGALURU_SOCIAL: RawReport[] = socialData as unknown as RawReport[];
