"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AuditLogEntry,
  Channel,
  EngineSettings,
  Incident,
  ProcessedReport,
  RawReport,
  SuggestedMerge,
  WardZone,
  WaterTrend,
} from "../engine/types";
import { BENGALURU_RAW_EVENTS, BENGALURU_WARD_ZONES } from "../data/bengaluru";
import { BENGALURU_2022_SCENARIO, ScenarioDefinition } from "../data/scenarios/bengaluru2022";
import { processReportExtraction } from "../engine/extractor";
import { resolveLocation } from "../engine/location/resolver";
import {
  evaluateReportIncidentMerge,
  mergeReportIntoIncident,
} from "../engine/merger/merger";
import { calculateDistanceMeters } from "../engine/merger/spatial";
import { computeTextFingerprint } from "../engine/merger/copyDetect";
import { calculateReliability } from "../engine/scoring/reliability";
import { calculateUrgency, DEFAULT_WEIGHTS } from "../engine/scoring/urgency";
import { calculateWardSilenceScore } from "../engine/scoring/silence";
import {
  computeEvaluationMetrics,
  EvaluationMetrics,
} from "../engine/simulation/evaluator";

export interface EventTickerItem {
  id: string;
  time: string;
  type: "new_incident" | "merged" | "silence_alert" | "urgency_spike" | "coordinator_action";
  text: string;
}

export interface CrisisStoreContextType {
  // Simulation State
  isPlaying: boolean;
  playbackSpeed: number;
  currentSimulatedTime: string;
  scenario: ScenarioDefinition;
  eventTicker: EventTickerItem[];
  showGroundTruth: boolean;
  showBaselineComparison: boolean;

  // Data State
  incidents: Incident[];
  processedReports: ProcessedReport[];
  wards: WardZone[];
  auditLogs: AuditLogEntry[];
  settings: EngineSettings;
  suggestedMerges: SuggestedMerge[];

  // Selection & UI State
  selectedIncidentId: string | null;
  activeLane:
    | "queue"
    | "needs_location"
    | "needs_human_reading"
    | "suggested_merges"
    | "silent_zones";
  channelFilter: "all" | "primary_sources";
  evaluationMetrics: EvaluationMetrics;

  // Actions
  togglePlay: () => void;
  stepForward: () => void;
  resetSimulation: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setChannelFilter: (filter: "all" | "primary_sources") => void;
  jumpToKeyMoment: (momentId: string) => void;
  injectRawReport: (rawText: string, channel?: string) => Promise<void>;

  // Coordinator Human-In-The-Loop Actions
  selectIncident: (id: string | null) => void;
  setActiveLane: (lane: CrisisStoreContextType["activeLane"]) => void;
  setShowGroundTruth: (show: boolean) => void;
  setShowBaselineComparison: (show: boolean) => void;
  overrideIncidentPriority: (incidentId: string, newScore: number, reason: string) => void;
  simulateDispatch: (
    incidentId: string,
    unitsSent: string,
    instructions: string,
    reason: string
  ) => void;
  markFalseAlarm: (incidentId: string, reason: string) => void;
  assignWelfareCheck: (
    wardId: string,
    actionType: "volunteer_call" | "boat_patrol" | "drone_recon",
    notes: string,
    reason: string
  ) => void;
  confirmSuggestedMerge: (mergeId: string, reason: string) => void;
  splitIncident: (incidentId: string, reportIdToSplit: string, reason: string) => void;
  resolveReportLocationManually: (
    reportId: string,
    coords: { lat: number; lng: number },
    landmarkName: string,
    reason: string
  ) => void;
  updateSettings: (newSettings: Partial<EngineSettings>) => void;
}

export const defaultSettings: EngineSettings = {
  weights: { ...DEFAULT_WEIGHTS },
  thresholds: {
    silence_flag_threshold: 0.6,
    // The replay spans 25 days and low-connectivity reports can arrive many
    // hours after the event. A 6-hour window keeps same-event duplicates
    // together without collapsing separate days.
    merge_distance_meters: 600,
    merge_time_window_mins: 360,
    fairness_boost_max: 0.1,
  },
  offline_mode: true,
  use_gemini_api: false,
};

const CrisisStoreContext = createContext<CrisisStoreContextType | null>(null);

export function cloneZones(): WardZone[] {
  return BENGALURU_WARD_ZONES.map((zone) => ({
    ...zone,
    center: { ...zone.center },
    boundary_polygon: zone.boundary_polygon.map((point) => [...point] as [number, number]),
    connectivity_overrides: (zone.connectivity_overrides || []).map((override) => ({ ...override })),
    adjacent_ward_ids: [...zone.adjacent_ward_ids],
    silence_breakdown: { ...zone.silence_breakdown },
    silence_reasons: [],
    silence_flagged_at: null,
  }));
}

function mapTrend(value: unknown): WaterTrend | null {
  const trend = String(value || "").toLowerCase();
  if (trend === "rising") return "rising";
  if (trend === "falling" || trend === "receding") return "falling";
  if (trend === "stable" || trend === "constant") return "stable";
  return null;
}

function combineProvenance(
  a: Incident["provenance"] | undefined,
  b: Incident["provenance"] | undefined
): Incident["provenance"] {
  if (!a) return b;
  if (!b) return a;
  if (a === b) return a;
  // A mixed incident is intentionally shown as reconstructed/amber rather
  // than overstating that every source is real.
  return "reconstructed";
}

export function eventKeyFor(raw: RawReport): string | undefined {
  if (raw.channel === "sensor") {
    return `sensor:${raw.metadata?.station || raw.sender_id}`;
  }
  if (raw.channel === "official") {
    return `official:${raw._gt_district || raw.location_hint?.name || raw.sender_id}`;
  }
  return undefined;
}

function channelLabel(channel: Channel): string {
  switch (channel) {
    case "call_transcript":
      return "call transcript";
    case "volunteer_app":
      return "volunteer report";
    case "official":
      return "official bulletin";
    case "sensor":
      return "KSNDMC telemetry";
    default:
      return channel;
  }
}

function buildKnownFields(partial: {
  water_band: Incident["water_band"];
  water_level_cm: number | null;
  life_risk: Incident["life_risk"];
  people_count_display: string;
  vulnerable_groups: Incident["vulnerable_groups"];
  hazards: Incident["hazards"];
  access_status: Incident["access_status"];
}) {
  const confirmed_facts: string[] = [];
  const unknown_fields: string[] = [];

  if (partial.water_band) {
    confirmed_facts.push(
      `Water level: ${partial.water_band}${partial.water_level_cm ? ` (${partial.water_level_cm} cm)` : ""}`
    );
  } else unknown_fields.push("Water depth");

  if (partial.life_risk !== "none_stated") confirmed_facts.push(`Life risk: ${partial.life_risk}`);
  else unknown_fields.push("Life risk status");

  if (partial.people_count_display !== "Unknown") {
    confirmed_facts.push(`People count: ${partial.people_count_display}`);
  } else unknown_fields.push("People count");

  if (partial.vulnerable_groups.length > 0) {
    confirmed_facts.push(`Vulnerable groups: ${partial.vulnerable_groups.join(", ")}`);
  }
  if (partial.hazards.length > 0) confirmed_facts.push(`Hazards: ${partial.hazards.join(", ")}`);
  if (partial.access_status) confirmed_facts.push(`Access: ${partial.access_status}`);

  return { confirmed_facts, unknown_fields };
}

export function createIncident(
  raw: RawReport,
  processed: ProcessedReport,
  incidentNumber: number
): Incident {
  const extracted = processed.extracted;
  const people = extracted.people_count;
  const peopleCountRange =
    typeof people === "number"
      ? { min: people, max: people }
      : people
      ? { min: people.min, max: people.max }
      : { min: 0, max: 0 };
  const people_count_display =
    peopleCountRange.max > 0
      ? peopleCountRange.min === peopleCountRange.max
        ? `${peopleCountRange.min} reported`
        : `${peopleCountRange.min} to ${peopleCountRange.max} reported`
      : "Unknown";

  let title: string;
  if (raw.channel === "sensor") {
    title = `${raw.metadata?.waterbody || raw.metadata?.river || "Gauge"} at ${raw.metadata?.station || "KSNDMC station"} — telemetry`;
  } else if (raw.channel === "official") {
    title = `${raw._gt_district || "Bengaluru"} — ${raw.sender_id} bulletin`;
  } else {
    title = `${processed.location.landmark_name || raw._gt_district || "Bengaluru"} — ${channelLabel(
      raw.channel
    )}`;
  }

  const life_risk = extracted.life_risk || "none_stated";
  const known = buildKnownFields({
    water_band: extracted.water_band,
    water_level_cm: extracted.water_level_cm,
    life_risk,
    people_count_display,
    vulnerable_groups: extracted.vulnerable_groups,
    hazards: extracted.hazards,
    access_status: extracted.access_status,
  });

  return {
    id: `inc-${raw.id}`,
    incident_number: incidentNumber,
    title,
    primary_report_id: raw.id,
    source_report_ids: [raw.id],
    event_key: eventKeyFor(raw),
    channels: [raw.channel],
    source_types: [raw.source_type],
    provenance: raw.provenance,
    distinct_reporters_count: 1,
    created_at: raw.timestamp,
    updated_at: raw.timestamp,
    location: processed.location,
    people_count_display,
    people_count_range: peopleCountRange,
    life_risk,
    vulnerable_groups: extracted.vulnerable_groups,
    water_band: extracted.water_band,
    water_level_cm: extracted.water_level_cm,
    water_trend: extracted.water_trend,
    hazards: extracted.hazards,
    access_status: extracted.access_status,
    confirmed_facts: known.confirmed_facts,
    unknown_fields: known.unknown_fields,
    reliability_score: 50,
    reliability_reasons: { pro: [], con: [] },
    is_verify_urgently: false,
    urgency_score: 0.05,
    urgency_breakdown: {
      life_risk_component: 0,
      vulnerability_component: 0,
      hazard_component: 0,
      time_waiting_component: 0,
      access_component: 0,
      reliability_component: 0,
      fairness_boost: 0,
      total: 0.05,
    },
    fairness_boost_applied: false,
    status: "active",
    priority_rank: 1,
  };
}

export function foldReportIntoIncident(incident: Incident, report: ProcessedReport): Incident {
  const merged = mergeReportIntoIncident(incident, report);
  return {
    ...merged,
    event_key: incident.event_key,
    title: incident.title,
    provenance: combineProvenance(incident.provenance, report.provenance),
    // A long-running telemetry station or bulletin desk is one upstream source,
    // even when it contributes hundreds of readings.
    distinct_reporters_count: incident.event_key
      ? incident.distinct_reporters_count
      : merged.distinct_reporters_count,
  };
}

export interface RecomputeResult {
  incidents: Incident[];
  wards: WardZone[];
  newlyFlagged: WardZone[];
}

export function recomputeState(
  simTime: string,
  rawIncidents: Incident[],
  reports: ProcessedReport[],
  rawWards: WardZone[],
  settings: EngineSettings
): RecomputeResult {
  const currentMs = new Date(simTime).getTime();

  // 1. Ward reporting stats + time-varying connectivity
  let updatedWards = rawWards.map((ward) => {
    const wardReports = reports.filter(
      (report) => report.location.ward_id === ward.id && report.raw.channel !== "sensor"
    );
    const actualCount = wardReports.length;
    const coverage = actualCount / Math.max(1, ward.expected_reports_count);
    const lastReport =
      wardReports.length > 0
        ? wardReports.reduce((latest, report) =>
            new Date(report.raw.timestamp).getTime() > new Date(latest).getTime()
              ? report.raw.timestamp
              : latest
          , wardReports[0].raw.timestamp)
        : null;

    let connectivity = ward.base_connectivity ?? ward.connectivity_index;
    for (const override of ward.connectivity_overrides || []) {
      if (currentMs >= new Date(override.after).getTime()) {
        connectivity = override.new_value;
      }
    }

    return {
      ...ward,
      actual_reports_count: actualCount,
      report_coverage: Math.min(1, coverage),
      last_report_timestamp: lastReport,
      connectivity_index: connectivity,
      connectivity_outage: connectivity < 0.15,
    };
  });

  // 2. Silence scores (needs the full updated ward list for neighbour signals)
  const newlyFlagged: WardZone[] = [];
  updatedWards = updatedWards.map((ward) => {
    const silence = calculateWardSilenceScore(
      ward,
      updatedWards,
      rawIncidents,
      simTime,
      settings.thresholds.silence_flag_threshold
    );
    const wasFlagged = ward.is_flagged_silent;
    const silence_flagged_at =
      silence.isFlaggedSilent && !ward.silence_flagged_at ? simTime : ward.silence_flagged_at;
    const nextWard: WardZone = {
      ...ward,
      silence_score: silence.score,
      silence_breakdown: silence.breakdown,
      is_flagged_silent: silence.isFlaggedSilent,
      silence_reasons: silence.reasons,
      silence_flagged_at,
    };
    if (silence.isFlaggedSilent && !wasFlagged) newlyFlagged.push(nextWard);
    return nextWard;
  });

  // 3. Re-score every incident against the latest connectivity and coverage
  const wardById = new Map(updatedWards.map((ward) => [ward.id, ward]));
  let updatedIncidents = rawIncidents.map((incident) => {
    const ward = incident.location.ward_id ? wardById.get(incident.location.ward_id) : undefined;
    const reliability = calculateReliability(incident);
    const urgency = calculateUrgency(incident, ward, simTime, settings.weights);
    return {
      ...incident,
      reliability_score: reliability.score,
      reliability_reasons: { pro: reliability.pros, con: reliability.cons },
      is_verify_urgently: reliability.isVerifyUrgently,
      verify_urgently_reason: reliability.verifyReason,
      suggested_verification: reliability.suggestedVerification,
      urgency_score: urgency.score,
      urgency_breakdown: urgency.breakdown,
      fairness_boost_applied: urgency.fairness_boost_applied,
      fairness_boost_reason: urgency.fairness_boost_reason,
    };
  });

  updatedIncidents.sort((a, b) => b.urgency_score - a.urgency_score);
  updatedIncidents = updatedIncidents.map((incident, index) => ({
    ...incident,
    previous_rank: incident.priority_rank,
    priority_rank: index + 1,
    rank_delta: (incident.previous_rank || index + 1) - (index + 1),
  }));

  return { incidents: updatedIncidents, wards: updatedWards, newlyFlagged };
}

export function CrisisProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(5);
  const [scenario] = useState<ScenarioDefinition>(BENGALURU_2022_SCENARIO);
  const [currentSimulatedTime, setCurrentSimulatedTime] = useState<string>(
    BENGALURU_2022_SCENARIO.startTime
  );
  const [eventTicker, setEventTicker] = useState<EventTickerItem[]>([]);
  const [showGroundTruth, setShowGroundTruth] = useState(false);
  const [showBaselineComparison, setShowBaselineComparison] = useState(false);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [processedReports, setProcessedReports] = useState<ProcessedReport[]>([]);
  const [wards, setWards] = useState<WardZone[]>(() => cloneZones());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<EngineSettings>(defaultSettings);
  const [suggestedMerges, setSuggestedMerges] = useState<SuggestedMerge[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeLane, setActiveLane] =
    useState<CrisisStoreContextType["activeLane"]>("queue");
  const [channelFilter, setChannelFilter] = useState<"all" | "primary_sources">("all");

  const incidentsRef = useRef<Incident[]>([]);
  const reportsRef = useRef<ProcessedReport[]>([]);
  const wardsRef = useRef<WardZone[]>(cloneZones());
  const suggestionsRef = useRef<SuggestedMerge[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const fingerprintsRef = useRef<Map<string, string>>(new Map());
  const incidentCounterRef = useRef(1);
  const simTimeRef = useRef(BENGALURU_2022_SCENARIO.startTime);
  const settingsRef = useRef(defaultSettings);
  const selectedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const advancingRef = useRef(false);

  const logAudit = useCallback(
    (
      actionType: AuditLogEntry["action_type"],
      targetId: string,
      targetTitle: string,
      before: any,
      after: any,
      reason: string
    ) => {
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: simTimeRef.current,
        actor: "Coordinator (Human-In-The-Loop)",
        action_type: actionType,
        target_id: targetId,
        target_title: targetTitle,
        before_state: before,
        after_state: after,
        reason,
      };
      setAuditLogs((prev) => [entry, ...prev]);
    },
    []
  );

  const applyEvaluation = useCallback(
    (result: RecomputeResult, simTime: string, allowTicker = true) => {
      incidentsRef.current = result.incidents;
      wardsRef.current = result.wards;
      setIncidents(result.incidents);
      setWards(result.wards);

      if (result.incidents.length > 0) {
        const stillExists = result.incidents.some(
          (incident) => incident.id === selectedRef.current
        );
        if (!stillExists) {
          selectedRef.current = result.incidents[0].id;
          setSelectedIncidentId(result.incidents[0].id);
        }
      }

      if (allowTicker && result.newlyFlagged.length > 0) {
        setEventTicker((prev) => [
          ...result.newlyFlagged.map((ward) => ({
            id: `silence-${ward.id}-${simTime}`,
            time: simTime,
            type: "silence_alert" as const,
            text: `[Silence Alert] ${ward.name} flagged for possible unreported need (score ${ward.silence_score.toFixed(2)}).`,
          })),
          ...prev,
        ].slice(0, 40));
      }
    },
    []
  );

  const buildProcessedReport = useCallback(async (raw: RawReport): Promise<ProcessedReport> => {
    const extraction = await processReportExtraction(raw, { offlineMode: true });
    let extracted = extraction.extracted;

    // Telemetry channels carry calibrated numeric fields in metadata; prefer
    // those over text parsing (the bulletin text is in metres, not cm).
    if (raw.channel === "sensor" && raw.metadata) {
      extracted = {
        ...extracted,
        life_risk: "none_stated",
        water_level_cm:
          typeof raw.metadata.level_cm === "number" ? raw.metadata.level_cm : extracted.water_level_cm,
        water_trend: mapTrend(raw.metadata.trend) || extracted.water_trend,
        hazards: [],
        access_status: null,
      };
    }

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
      extraction_status: extraction.status,
      parse_error_details: extraction.error,
    };
  }, []);

  const processBatch = useCallback(
    async (arrivals: RawReport[], simTime: string) => {
      const reports = [...reportsRef.current];
      const currentIncidents = [...incidentsRef.current];
      const suggestions = [...suggestionsRef.current];
      const processedIds = processedIdsRef.current;
      const fingerprints = fingerprintsRef.current;
      const activeSettings = settingsRef.current;

      let newIncidentCount = 0;
      let mergedCount = 0;
      let newSuggestionCount = 0;

      for (const raw of arrivals) {
        if (processedIds.has(raw.id)) continue;
        const processed = await buildProcessedReport(raw);
        processedIds.add(raw.id);

        // Recycled copy-paste detection (text normalisation, not ground truth)
        const fingerprint = computeTextFingerprint(raw.raw_text);
        if (raw.channel !== "sensor" && fingerprints.has(fingerprint)) {
          processed.is_recycled_duplicate = true;
        } else {
          fingerprints.set(fingerprint, raw.id);
        }
        processed.recycled_hash = fingerprint;
        reports.push(processed);

        const eventKey = eventKeyFor(raw);
        let folded = false;

        if (eventKey) {
          const index = currentIncidents.findIndex(
            (incident) => incident.event_key === eventKey
          );
          if (index >= 0) {
            currentIncidents[index] = foldReportIntoIncident(
              currentIncidents[index],
              processed
            );
            folded = true;
            mergedCount++;
          }
        } else {
          let bestSuggestion: { incident: Incident; confidence: number; reasons: string[]; conflicts: string[] } | null =
            null;

          for (let i = 0; i < currentIncidents.length; i++) {
            const incident = currentIncidents[i];
            if (incident.event_key) continue; // never merge citizen reports into telemetry desks
            if (!incident.location.resolved) continue;

            const evaluation = evaluateReportIncidentMerge(
              processed,
              incident,
              activeSettings.thresholds.merge_time_window_mins,
              activeSettings.thresholds.merge_distance_meters
            );

            if (evaluation.canAutoMerge) {
              currentIncidents[i] = foldReportIntoIncident(incident, processed);
              folded = true;
              mergedCount++;
              break;
            }

            if (
              evaluation.canSuggestMerge &&
              (!bestSuggestion || evaluation.confidence > bestSuggestion.confidence)
            ) {
              bestSuggestion = {
                incident,
                confidence: evaluation.confidence,
                reasons: evaluation.reasons,
                conflicts: evaluation.blockers,
              };
            }
          }

          if (!folded && bestSuggestion) {
            const newIncident = createIncident(
              raw,
              processed,
              incidentCounterRef.current++
            );
            const alreadySuggested = suggestions.some(
              (suggestion) =>
                suggestion.incident_a_id === bestSuggestion!.incident.id &&
                suggestion.incident_b_id === newIncident.id
            );
            if (!alreadySuggested && suggestions.length < 25) {
              suggestions.push({
                id: `sug-${raw.id}`,
                incident_a_id: bestSuggestion.incident.id,
                incident_b_id: newIncident.id,
                confidence: bestSuggestion.confidence,
                overlap_reasons: bestSuggestion.reasons,
                conflicts: bestSuggestion.conflicts,
                suggested_at: simTime,
              });
              newSuggestionCount++;
            }
            currentIncidents.push(newIncident);
            newIncidentCount++;
            folded = true; // incident created; skip the generic create below
          }
        }

        if (!folded) {
          currentIncidents.push(
            createIncident(raw, processed, incidentCounterRef.current++)
          );
          newIncidentCount++;
        }
      }

      reportsRef.current = reports;
      suggestionsRef.current = suggestions;
      setProcessedReports(reports);
      setSuggestedMerges(suggestions);

      const result = recomputeState(
        simTime,
        currentIncidents,
        reports,
        wardsRef.current,
        activeSettings
      );
      applyEvaluation(result, simTime);

      if (arrivals.length > 0) {
        const summary =
          newIncidentCount > 0 || mergedCount > 0
            ? `${arrivals.length} event${arrivals.length === 1 ? "" : "s"} ingested — ${newIncidentCount} new incident${newIncidentCount === 1 ? "" : "s"}, ${mergedCount} merged${newSuggestionCount ? `, ${newSuggestionCount} merge suggestion${newSuggestionCount === 1 ? "" : "s"}` : ""}.`
            : `${arrivals.length} event${arrivals.length === 1 ? "" : "s"} ingested into existing incidents.`;
        const item: EventTickerItem = {
          id: `batch-${simTime}-${Date.now()}`,
          time: simTime,
          type: mergedCount >= newIncidentCount ? "merged" : "new_incident",
          text: summary,
        };
        setEventTicker((prev) => [item, ...prev].slice(0, 40));
      }
    },
    [applyEvaluation, buildProcessedReport]
  );

  const replayTo = useCallback(
    async (targetIso: string, reset: boolean) => {
      const targetMs = new Date(targetIso).getTime();

      if (reset) {
        reportsRef.current = [];
        incidentsRef.current = [];
        wardsRef.current = cloneZones();
        suggestionsRef.current = [];
        processedIdsRef.current = new Set();
        fingerprintsRef.current = new Map();
        incidentCounterRef.current = 1;
        selectedRef.current = null;
        setProcessedReports([]);
        setIncidents([]);
        setWards(cloneZones());
        setSuggestedMerges([]);
        setSelectedIncidentId(null);
      }

      const arrivals = BENGALURU_RAW_EVENTS.filter(
        (raw) =>
          new Date(raw.timestamp).getTime() <= targetMs &&
          !processedIdsRef.current.has(raw.id)
      ).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() ||
          a.id.localeCompare(b.id)
      );

      // Process arrivals in availability-time groups. Applying the whole jump
      // in one batch would stamp every silence flag with the jump target and
      // destroy the lead-time metric. Grouping preserves the moment each zone
      // first crossed the threshold.
      const arrivalsByTimestamp = new Map<string, RawReport[]>();
      for (const raw of arrivals) {
        const bucket = arrivalsByTimestamp.get(raw.timestamp);
        if (bucket) bucket.push(raw);
        else arrivalsByTimestamp.set(raw.timestamp, [raw]);
      }
      for (const [timestamp, batch] of arrivalsByTimestamp) {
        await processBatch(batch, timestamp);
      }

      // Time may advance beyond the last arrival (and time-varying
      // connectivity can change without a new message), so re-score once at
      // the exact target instant.
      const result = recomputeState(
        targetIso,
        incidentsRef.current,
        reportsRef.current,
        wardsRef.current,
        settingsRef.current
      );
      applyEvaluation(result, targetIso, false);

      simTimeRef.current = targetIso;
      setCurrentSimulatedTime(targetIso);
      setIsPlaying(false);
    },
    [applyEvaluation, processBatch]
  );

  // Seed the replay at the scenario start (inclusive) once on mount.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void replayTo(BENGALURU_2022_SCENARIO.startTime, true);
  }, [replayTo]);

  // Keep refs in sync when settings change and re-score immediately.
  const updateSettings = useCallback(
    (newSettings: Partial<EngineSettings>) => {
      const next: EngineSettings = {
        ...settingsRef.current,
        ...newSettings,
        weights: { ...settingsRef.current.weights, ...(newSettings.weights || {}) },
        thresholds: {
          ...settingsRef.current.thresholds,
          ...(newSettings.thresholds || {}),
        },
      };
      settingsRef.current = next;
      setSettings(next);

      const result = recomputeState(
        simTimeRef.current,
        incidentsRef.current,
        reportsRef.current,
        wardsRef.current,
        next
      );
      applyEvaluation(result, simTimeRef.current, false);
    },
    [applyEvaluation]
  );

  const advanceTimeByMinutes = useCallback(
    async (mins: number) => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      try {
        const currentIso = simTimeRef.current;
        const currentMs = new Date(currentIso).getTime();
        const endMs = new Date(scenario.endTime).getTime();
        const nextMs = Math.min(endMs, currentMs + mins * 60 * 1000);
        if (nextMs <= currentMs) {
          setIsPlaying(false);
          return;
        }
        const nextIso = new Date(nextMs).toISOString();

        const arrivals = BENGALURU_RAW_EVENTS.filter((raw) => {
          const timestamp = new Date(raw.timestamp).getTime();
          return (
            timestamp > currentMs &&
            timestamp <= nextMs &&
            !processedIdsRef.current.has(raw.id)
          );
        });

        await processBatch(arrivals, nextIso);
        simTimeRef.current = nextIso;
        setCurrentSimulatedTime(nextIso);
        if (nextMs >= endMs) setIsPlaying(false);
      } finally {
        advancingRef.current = false;
      }
    },
    [processBatch, scenario.endTime]
  );

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      void advanceTimeByMinutes(playbackSpeed);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, advanceTimeByMinutes]);

  const jumpToKeyMoment = useCallback(
    async (momentId: string) => {
      const moment = scenario.keyMoments.find((entry) => entry.id === momentId);
      if (!moment) return;

      await replayTo(moment.timestamp, true);
      const item: EventTickerItem = {
        id: `jump-${moment.id}-${Date.now()}`,
        time: moment.timestamp,
        type: "urgency_spike",
        text: `[Jump] Replayed to ${moment.title}. ${moment.expectedOutcome}`,
      };
      setEventTicker((prev) => [item, ...prev].slice(0, 40));
    },
    [replayTo, scenario.keyMoments]
  );

  const resetSimulation = useCallback(() => {
    void replayTo(BENGALURU_2022_SCENARIO.startTime, true);
    setEventTicker([
      {
        id: `reset-${Date.now()}`,
        time: BENGALURU_2022_SCENARIO.startTime,
        type: "coordinator_action",
        text: "Replay reset to the start of the Bengaluru flood window (22 August 2022, 00:00 IST).",
      },
    ]);
  }, [replayTo]);

  const injectRawReport = useCallback(
    async (rawText: string, channel: string = "sms") => {
      const customRaw: RawReport = {
        id: `inject-${Date.now().toString(36)}`,
        channel: channel as Channel,
        sender_id: `custom-user-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: simTimeRef.current,
        raw_text: rawText,
        source_type: "first_hand",
        provenance: "reconstructed",
      };
      await processBatch([customRaw], simTimeRef.current);
    },
    [processBatch]
  );

  const selectIncident = useCallback((id: string | null) => {
    selectedRef.current = id;
    setSelectedIncidentId(id);
  }, []);

  const overrideIncidentPriority = useCallback(
    (incidentId: string, newScore: number, reason: string) => {
      const target = incidentsRef.current.find((incident) => incident.id === incidentId);
      if (!target) return;

      const updated = incidentsRef.current.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              urgency_score: newScore,
              coordinator_override: {
                urgency_score: newScore,
                reason,
                overridden_at: simTimeRef.current,
                overridden_by: "Lead Coordinator",
              },
            }
          : incident
      );
      updated.sort((a, b) => b.urgency_score - a.urgency_score);
      const ranked = updated.map((incident, index) => ({
        ...incident,
        previous_rank: incident.priority_rank,
        priority_rank: index + 1,
        rank_delta: (incident.previous_rank || index + 1) - (index + 1),
      }));

      incidentsRef.current = ranked;
      setIncidents(ranked);
      logAudit(
        "priority_override",
        incidentId,
        target.title,
        { urgency_score: target.urgency_score },
        { urgency_score: newScore },
        reason
      );
    },
    [logAudit]
  );

  const simulateDispatch = useCallback(
    (incidentId: string, unitsSent: string, instructions: string, reason: string) => {
      const target = incidentsRef.current.find((incident) => incident.id === incidentId);
      if (!target) return;

      const updated = incidentsRef.current.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              status: "dispatched" as const,
              dispatch_details: {
                dispatched_at: simTimeRef.current,
                dispatched_by: "Control Room Chief",
                units_sent: unitsSent,
                special_instructions: instructions,
                simulated: true as const,
              },
            }
          : incident
      );
      incidentsRef.current = updated;
      setIncidents(updated);
      logAudit(
        "simulated_dispatch",
        incidentId,
        target.title,
        { status: target.status },
        { status: "dispatched", unitsSent, instructions },
        reason
      );
    },
    [logAudit]
  );

  const markFalseAlarm = useCallback(
    (incidentId: string, reason: string) => {
      const target = incidentsRef.current.find((incident) => incident.id === incidentId);
      if (!target) return;

      const updated = incidentsRef.current.filter((incident) => incident.id !== incidentId);
      incidentsRef.current = updated;
      setIncidents(updated);
      if (selectedRef.current === incidentId) {
        selectedRef.current = updated[0]?.id || null;
        setSelectedIncidentId(selectedRef.current);
      }
      logAudit(
        "mark_false_alarm",
        incidentId,
        target.title,
        { status: target.status },
        { status: "dismissed_false_alarm" },
        reason
      );
    },
    [logAudit]
  );

  const assignWelfareCheck = useCallback(
    (
      wardId: string,
      actionType: "volunteer_call" | "boat_patrol" | "drone_recon",
      notes: string,
      reason: string
    ) => {
      const target = wardsRef.current.find((ward) => ward.id === wardId);
      if (!target) return;

      const updated = wardsRef.current.map((ward) =>
        ward.id === wardId
          ? {
              ...ward,
              welfare_check_assigned: {
                assigned_at: simTimeRef.current,
                assigned_by: "Coordinator",
                action_type: actionType,
                notes,
              },
            }
          : ward
      );
      wardsRef.current = updated;
      setWards(updated);
      logAudit(
        "welfare_check_assigned",
        wardId,
        target.name,
        { welfare_check_assigned: target.welfare_check_assigned },
        { actionType, notes },
        reason
      );
    },
    [logAudit]
  );

  const confirmSuggestedMerge = useCallback(
    (mergeId: string, reason: string) => {
      const suggestion = suggestionsRef.current.find((entry) => entry.id === mergeId);
      if (!suggestion) return;

      const incidentA = incidentsRef.current.find(
        (incident) => incident.id === suggestion.incident_a_id
      );
      const incidentB = incidentsRef.current.find(
        (incident) => incident.id === suggestion.incident_b_id
      );
      if (!incidentA || !incidentB) return;

      const merged: Incident = {
        ...incidentA,
        source_report_ids: Array.from(
          new Set([...incidentA.source_report_ids, ...incidentB.source_report_ids])
        ),
        channels: Array.from(new Set([...incidentA.channels, ...incidentB.channels])),
        source_types: Array.from(
          new Set([...incidentA.source_types, ...incidentB.source_types])
        ),
        provenance: combineProvenance(incidentA.provenance, incidentB.provenance),
        distinct_reporters_count:
          incidentA.distinct_reporters_count + incidentB.distinct_reporters_count,
        updated_at:
          new Date(incidentA.updated_at).getTime() > new Date(incidentB.updated_at).getTime()
            ? incidentA.updated_at
            : incidentB.updated_at,
      };

      const updated = incidentsRef.current
        .filter((incident) => incident.id !== incidentB.id)
        .map((incident) => (incident.id === incidentA.id ? merged : incident));
      const result = recomputeState(
        simTimeRef.current,
        updated,
        reportsRef.current,
        wardsRef.current,
        settingsRef.current
      );
      applyEvaluation(result, simTimeRef.current, false);

      const remainingSuggestions = suggestionsRef.current.filter(
        (entry) => entry.id !== mergeId
      );
      suggestionsRef.current = remainingSuggestions;
      setSuggestedMerges(remainingSuggestions);

      logAudit(
        "merge_confirmed",
        mergeId,
        `Merged "${incidentB.title}" into "${incidentA.title}"`,
        { incidentA, incidentB },
        { merged },
        reason
      );
    },
    [applyEvaluation, logAudit]
  );

  const splitIncident = useCallback(
    (incidentId: string, reportIdToSplit: string, reason: string) => {
      const target = incidentsRef.current.find((incident) => incident.id === incidentId);
      if (!target || target.source_report_ids.length <= 1) return;
      const splitReport = reportsRef.current.find((report) => report.id === reportIdToSplit);
      if (!splitReport) return;

      const updatedTarget: Incident = {
        ...target,
        source_report_ids: target.source_report_ids.filter((id) => id !== reportIdToSplit),
      };
      const newIncident = createIncident(
        splitReport.raw,
        splitReport,
        incidentCounterRef.current++
      );

      const result = recomputeState(
        simTimeRef.current,
        [...incidentsRef.current.filter((incident) => incident.id !== incidentId), updatedTarget, newIncident],
        reportsRef.current,
        wardsRef.current,
        settingsRef.current
      );
      applyEvaluation(result, simTimeRef.current, false);
      logAudit(
        "merge_split",
        incidentId,
        target.title,
        { target },
        { updatedTarget, newIncident },
        reason
      );
    },
    [applyEvaluation, logAudit]
  );

  const resolveReportLocationManually = useCallback(
    (reportId: string, coords: { lat: number; lng: number }, landmarkName: string, reason: string) => {
      const report = reportsRef.current.find((entry) => entry.id === reportId);
      if (!report) return;

      let nearest = wardsRef.current[0];
      let nearestDistance = Infinity;
      for (const ward of wardsRef.current) {
        const distance = calculateDistanceMeters(coords, ward.center);
        if (distance < nearestDistance) {
          nearest = ward;
          nearestDistance = distance;
        }
      }

      const manualLocation = {
        resolved: true,
        coords,
        uncertainty_radius_m: 50,
        landmark_name: landmarkName,
        ward_id: nearest.id,
        district: nearest.district || null,
        resolution_method: "exact_landmark" as const,
        needs_location_lane: false,
        notes: `Manually anchored by coordinator: ${reason}`,
      };
      const updatedReport: ProcessedReport = { ...report, location: manualLocation };
      const updatedReports = reportsRef.current.map((entry) =>
        entry.id === reportId ? updatedReport : entry
      );
      reportsRef.current = updatedReports;
      setProcessedReports(updatedReports);

      const result = recomputeState(
        simTimeRef.current,
        incidentsRef.current,
        updatedReports,
        wardsRef.current,
        settingsRef.current
      );
      applyEvaluation(result, simTimeRef.current, false);
      logAudit(
        "location_override",
        reportId,
        `Report ${reportId}`,
        { location: report.location },
        { location: manualLocation },
        reason
      );
    },
    [applyEvaluation, logAudit]
  );

  const evaluationMetrics = useMemo(
    () => computeEvaluationMetrics(incidents, processedReports, wards),
    [incidents, processedReports, wards]
  );

  // Development-only hook used by the replay verification script. It is
  // stripped from production builds by the NODE_ENV compile-time constant.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (window as any).__crisisDebug = {
      replayTo,
      jumpToKeyMoment,
      getState: () => ({
        simTime: simTimeRef.current,
        incidents: incidentsRef.current,
        reports: reportsRef.current,
        wards: wardsRef.current,
        suggestions: suggestionsRef.current,
        metrics: computeEvaluationMetrics(
          incidentsRef.current,
          reportsRef.current,
          wardsRef.current
        ),
      }),
    };
  }, [replayTo, jumpToKeyMoment]);

  return (
    <CrisisStoreContext.Provider
      value={{
        isPlaying,
        playbackSpeed,
        currentSimulatedTime,
        scenario,
        eventTicker,
        showGroundTruth,
        showBaselineComparison,
        incidents,
        processedReports,
        wards,
        auditLogs,
        settings,
        suggestedMerges,
        selectedIncidentId,
        activeLane,
        channelFilter,
        evaluationMetrics,
        togglePlay: () => setIsPlaying((playing) => !playing),
        stepForward: () => {
          void advanceTimeByMinutes(10);
        },
        resetSimulation,
        setPlaybackSpeed,
        setChannelFilter,
        jumpToKeyMoment,
        injectRawReport,
        selectIncident,
        setActiveLane,
        setShowGroundTruth,
        setShowBaselineComparison,
        overrideIncidentPriority,
        simulateDispatch,
        markFalseAlarm,
        assignWelfareCheck,
        confirmSuggestedMerge,
        splitIncident,
        resolveReportLocationManually,
        updateSettings,
      }}
    >
      {children}
    </CrisisStoreContext.Provider>
  );
}

export function useCrisisStore() {
  const context = useContext(CrisisStoreContext);
  if (!context) {
    throw new Error("useCrisisStore must be used within a CrisisProvider");
  }
  return context;
}
