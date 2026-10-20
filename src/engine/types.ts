import { z } from "zod";

// --- Extraction Schema & Types ---

export type LifeRisk =
  | "trapped"
  | "injured"
  | "unconscious"
  | "medically_dependent"
  | "none_stated";

export type VulnerableGroup =
  | "elderly"
  | "children"
  | "disabled"
  | "pregnant";

export type WaterBand =
  | "ankle"
  | "knee"
  | "waist"
  | "chest"
  | "above_head";

export type WaterTrend = "rising" | "stable" | "falling";

export type Hazard = "electrical" | "current" | "collapse";

export type AccessStatus = "road_cut" | "boat_needed" | "blocked" | "ok";

export type SourceType =
  | "first_hand"
  | "second_hand"
  | "volunteer"
  | "sensor"
  | "official";

export type Channel =
  | "sms"
  | "social"
  | "volunteer_app"
  | "call_transcript"
  | "sensor"
  | "official";

// Every event in the Bengaluru replay is generated offline, so the replay has a
// single provenance state. The badge and combined-incident logic stay trivially
// correct by construction.
export type Provenance = "reconstructed";

export interface EvidenceSpan {
  text: string;
  field: string;
  confidence: number;
}

export interface PeopleCount {
  min: number;
  max: number;
  exact?: number;
}

export const ExtractedReportSchema = z.object({
  location_raw: z.string().nullable().default(null),
  location_qualifiers: z.string().nullable().default(null),
  people_count: z
    .union([
      z.number(),
      z.object({
        min: z.number(),
        max: z.number(),
        exact: z.number().optional(),
      }),
    ])
    .nullable()
    .default(null),
  life_risk: z
    .enum(["trapped", "injured", "unconscious", "medically_dependent", "none_stated"])
    .nullable()
    .default("none_stated"),
  vulnerable_groups: z
    .array(z.enum(["elderly", "children", "disabled", "pregnant"]))
    .default([]),
  water_level_cm: z.number().nullable().default(null),
  water_band: z
    .enum(["ankle", "knee", "waist", "chest", "above_head"])
    .nullable()
    .default(null),
  water_trend: z.enum(["rising", "stable", "falling"]).nullable().default(null),
  hazards: z.array(z.enum(["electrical", "current", "collapse"])).default([]),
  access_status: z
    .enum(["road_cut", "boat_needed", "blocked", "ok"])
    .nullable()
    .default(null),
  observed_at: z.string().nullable().default(null),
  reported_at: z.string().default(() => new Date().toISOString()),
  source_type: z
    .enum(["first_hand", "second_hand", "volunteer", "sensor", "official"])
    .default("second_hand"),
  language: z.string().default("en"),
  confidence_scores: z.record(z.number()).default({}),
  evidence_spans: z
    .record(
      z.object({
        text: z.string(),
        field: z.string(),
        confidence: z.number(),
      })
    )
    .default({}),
});

export type ExtractedReport = z.infer<typeof ExtractedReportSchema>;

// Raw Report Input
export interface RawReport {
  id: string;
  channel: Channel;
  sender_id: string;
  timestamp: string; // ISO string in simulation timeline
  raw_text: string;
  source_type: SourceType;
  provenance?: Provenance;
  metadata?: {
    social_likes?: number;
    shares?: number;
    sensor_id?: string;
    call_duration_sec?: number;
    station_id?: string;
    source_url?: string;
    is_second_hand?: boolean;
    station?: string;
    /** Waterbody name reported by the gauging station (synthetic sensor data). */
    waterbody?: string;
    river?: string;
    level_cm?: number;
    danger_level_cm?: number;
    warning_level_cm?: number;
    status?: string;
    trend?: string;
    facts?: Record<string, any>;
  };
  /** Exact coordinates supplied by the upstream channel (official bulletins,
   *  KSNDMC-style telemetry and geo-tagged social posts). Citizen reports normally
   *  have to be resolved through the gazetteer instead. */
  location_hint?: { lat: number; lng: number; name: string };
  _gt_backbone_id?: string;
  _gt_district?: string;
  _gt_is_duplicate_of?: string;
  _gt_is_rumour?: boolean;
}

// Location Resolution
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ResolvedLocation {
  resolved: boolean;
  coords: Coordinates | null;
  uncertainty_radius_m: number; // small for landmark pin, large for vague zone
  landmark_name: string | null;
  ward_id: string | null;
  district?: string | null;
  resolution_method: "exact_landmark" | "alias_match" | "fuzzy_landmark" | "relative_offset" | "district_centroid" | "channel_hint" | "osm_geocoding" | "unresolved";
  needs_location_lane: boolean;
  notes?: string;
}

// Normalized Processed Report
export interface ProcessedReport {
  id: string;
  raw: RawReport;
  extracted: ExtractedReport;
  location: ResolvedLocation;
  provenance?: Provenance;
  evidence_phrase?: string;
  extraction_status: "validated" | "needs_human_reading" | "malformed";
  parse_error_details?: string;
  recycled_hash?: string; // for copy-paste viral post detection
  is_recycled_duplicate?: boolean;
}

// Incident (represents merged deduplicated event)
export interface Incident {
  id: string;
  incident_number: number;
  title: string;
  primary_report_id: string;
  source_report_ids: string[];
  /** Stable key used to fold long-running telemetry/bulletin streams into a
   *  single incident (e.g. "sensor:Nanglamoraghat"). */
  event_key?: string;
  channels: Channel[];
  source_types: SourceType[];
  provenance?: Provenance;
  distinct_reporters_count: number;
  created_at: string;
  updated_at: string;
  
  // Consolidated Situation State
  location: ResolvedLocation;
  people_count_display: string;
  people_count_range: { min: number; max: number };
  life_risk: LifeRisk;
  vulnerable_groups: VulnerableGroup[];
  water_band: WaterBand | null;
  water_level_cm: number | null;
  water_trend: WaterTrend | null;
  hazards: Hazard[];
  access_status: AccessStatus | null;
  
  // Confirmed vs Unknown summary
  confirmed_facts: string[];
  unknown_fields: string[];

  // Scoring
  reliability_score: number; // 0-100
  reliability_reasons: { pro: string[]; con: string[] };
  is_verify_urgently: boolean; // severe life risk + low reliability
  verify_urgently_reason?: string;
  suggested_verification?: string; // "call-back", "dispatch nearby volunteer", "camera"

  urgency_score: number; // 0.0 - 1.0 (or 0-100 scaled)
  urgency_breakdown: {
    life_risk_component: number;       // wt: 0.30
    vulnerability_component: number;   // wt: 0.20
    hazard_component: number;          // wt: 0.15
    time_waiting_component: number;    // wt: 0.15
    access_component: number;          // wt: 0.10
    reliability_component: number;     // wt: 0.10
    fairness_boost: number;            // up to 0.10
    total: number;
  };

  fairness_boost_applied: boolean;
  fairness_boost_reason?: string;

  // Status & Human In The Loop
  status: "active" | "dispatched" | "resolved" | "dismissed_false_alarm";
  priority_rank: number;
  previous_rank?: number;
  rank_delta?: number; // e.g. +2 or -1

  // Coordinator Overrides
  coordinator_override?: {
    urgency_score?: number;
    priority_rank?: number;
    life_risk?: LifeRisk;
    location?: ResolvedLocation;
    reason: string;
    overridden_at: string;
    overridden_by: string;
  };

  // Dispatch Confirmation
  dispatch_details?: {
    dispatched_at: string;
    dispatched_by: string;
    units_sent: string;
    special_instructions: string;
    simulated: true;
  };
}

// Suggested Merge (for low-confidence overlaps requiring coordinator confirmation)
export interface SuggestedMerge {
  id: string;
  incident_a_id: string;
  incident_b_id: string;
  confidence: number;
  overlap_reasons: string[];
  conflicts: string[];
  suggested_at: string;
}

// Silence Layer (Zone Analysis)
export interface WardZone {
  id: string;
  name: string;
  code: string;
  population: number;
  area_sq_km: number;
  boundary_polygon: [number, number][]; // GeoJSON lat,lng ring
  center: Coordinates;
  
  // Static attributes
  district?: string;
  flood_exposure: number;     // 0.0 - 1.0 (river proximity, low elevation)
  vulnerability_index: number;// 0.0 - 1.0 (density, elderly/children share, housing)
  connectivity_index: number; // 0.0 - 1.0 (1.0 = 5G/good, 0.1 = remote/shadow)
  base_connectivity?: number;
  connectivity_outage: boolean;
  connectivity_overrides?: {
    after: string;
    new_value: number;
    reason: string;
  }[];
  
  // Dynamic runtime metrics
  actual_reports_count: number;
  expected_reports_count: number;
  report_coverage: number;    // actual / expected
  active_incidents_count: number;
  last_report_timestamp: string | null;
  went_quiet_detected: boolean;
  adjacent_ward_ids: string[];

  // Silence calculation
  silence_score: number;      // 0.0 - 1.0
  silence_breakdown: {
    exposure_term: number;
    vulnerability_term: number;
    connectivity_gap_term: number;
    coverage_deficit_term: number;
    neighbor_signal: number;
    went_quiet_signal: number;
  };
  is_flagged_silent: boolean; // score >= 0.60
  silence_reasons: string[];
  suggested_welfare_check: string;
  /** Simulation timestamp when this zone first crossed the silence threshold. */
  silence_flagged_at?: string | null;
  welfare_check_assigned?: {
    assigned_at: string;
    assigned_by: string;
    action_type: "volunteer_call" | "boat_patrol" | "drone_recon";
    notes: string;
  };
}

// Audit Log Item
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action_type:
    | "priority_override"
    | "value_override"
    | "location_override"
    | "merge_confirmed"
    | "merge_split"
    | "mark_false_alarm"
    | "welfare_check_assigned"
    | "silence_flag_dismissed"
    | "simulated_dispatch"
    | "weight_settings_adjusted";
  target_id: string; // incident id or ward id
  target_title: string;
  before_state: any;
  after_state: any;
  reason: string;
}

// Weight Configuration
export interface EngineSettings {
  weights: {
    life_risk: number;       // default 0.30
    vulnerable_groups: number; // default 0.20
    hazard_severity: number; // default 0.15
    time_waiting: number;    // default 0.15
    access_difficulty: number; // default 0.10
    report_reliability: number; // default 0.10
  };
  thresholds: {
    silence_flag_threshold: number; // default 0.60
    merge_distance_meters: number;  // default 300
    merge_time_window_mins: number; // default 90
    fairness_boost_max: number;     // default 0.10
  };
  offline_mode: boolean;
  use_gemini_api: boolean;
}

// Ground Truth for Evaluation
export interface GroundTruthReportLabel {
  report_id: string;
  true_incident_group_id: string;
  true_location_lat: number;
  true_location_lng: number;
  true_life_risk: LifeRisk;
  true_people_min: number;
  true_people_max: number;
  true_is_false_alarm: boolean;
  true_is_recycled: boolean;
}

export interface GroundTruthIncidentPriority {
  incident_group_id: string;
  true_priority_rank: number;
  true_urgency_tier: "critical" | "high" | "medium" | "low";
  reason: string;
}

export interface GroundTruthSilentZone {
  ward_id: string;
  ward_name?: string;
  truly_in_distress: boolean;
  failure_mode: "telecom_tower_flooded" | "remote_slum_no_phones" | "power_blackout" | string;
  onset_time?: string;
  silence_duration_mins?: number;
  expected_silence_score?: number;
  actual_incident_description?: string;
  is_true_emergency?: boolean;
}
