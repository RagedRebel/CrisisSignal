"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { BENGALURU_LANDMARKS } from "@/data/landmarks";
import {
  AlertTriangle,
  Search,
  MapPinOff,
  GitMerge,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Radio,
  MapPin,
  ArrowRight,
} from "lucide-react";

const TABS = [
  { id: "queue", label: "Queue", icon: Radio },
  { id: "needs_location", label: "Location", icon: MapPinOff },
  { id: "suggested_merges", label: "Merges", icon: GitMerge },
  { id: "silent_zones", label: "Silent", icon: ShieldAlert },
] as const;

export function QueuePanel({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const {
    incidents,
    selectedIncidentId,
    selectIncident,
    activeLane,
    setActiveLane,
    processedReports,
    suggestedMerges,
    wards,
    channelFilter,
    setChannelFilter,
    confirmSuggestedMerge,
    resolveReportLocationManually,
    assignWelfareCheck,
  } = useCrisisStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLifeRiskOnly, setFilterLifeRiskOnly] = useState(false);
  const [selectedReportForLoc, setSelectedReportForLoc] = useState<string | null>(null);
  const [chosenLandmarkId, setChosenLandmarkId] = useState(BENGALURU_LANDMARKS[0].id);
  const [locReason, setLocReason] = useState("");

  const needsLocationReports = processedReports.filter(
    (p) => p.location.needs_location_lane
  );
  const flaggedWards = wards.filter((w) => w.is_flagged_silent);
  const criticalCount = incidents.filter((i) => i.urgency_score >= 0.75).length;

  const filteredIncidents = incidents.filter((inc) => {
    if (
      channelFilter === "primary_sources" &&
      !inc.channels.some((channel) => channel === "sensor" || channel === "official")
    ) {
      return false;
    }
    if (searchTerm) {
      const matchTitle = inc.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLandmark = inc.location.landmark_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      if (!matchTitle && !matchLandmark) return false;
    }
    if (filterLifeRiskOnly && inc.life_risk === "none_stated") {
      return false;
    }
    return true;
  });

  const laneCount = (id: (typeof TABS)[number]["id"]) => {
    if (id === "queue") return incidents.length;
    if (id === "needs_location") return needsLocationReports.length;
    if (id === "suggested_merges") return suggestedMerges.length;
    return flaggedWards.length;
  };

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForLoc || !locReason.trim()) return;
    const lm =
      BENGALURU_LANDMARKS.find((l) => l.id === chosenLandmarkId) || BENGALURU_LANDMARKS[0];
    resolveReportLocationManually(selectedReportForLoc, lm.coords, lm.name, locReason);
    setSelectedReportForLoc(null);
    setLocReason("");
  };

  if (collapsed) {
    return (
      <aside className="absolute inset-y-0 left-0 z-20 flex w-11 flex-col items-center gap-3 border-r border-slate-800/80 bg-[#0b1120]/95 py-3 backdrop-blur-xl">
        <button
          onClick={onToggle}
          title="Expand report queue"
          className="rounded-md border border-slate-800 bg-slate-900 p-1.5 text-slate-400 transition-colors hover:text-white"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <span className="rounded-full border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
          {incidents.length}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600 [writing-mode:vertical-rl]">
          Report queue
        </span>
      </aside>
    );
  }

  return (
    <aside className="absolute inset-y-0 left-0 z-20 flex w-[360px] max-w-[92vw] flex-col border-r border-slate-800/80 bg-[#0b1120]/95 text-xs backdrop-blur-xl">
      {/* Panel header */}
      <div className="border-b border-slate-800 px-3.5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-white">Report queue</h2>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
              {incidents.length}
            </span>
          </div>
          <button
            onClick={onToggle}
            title="Collapse panel"
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
          <span>
            <b className="font-semibold text-slate-300">{criticalCount}</b> critical
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <b className="font-semibold text-slate-300">{needsLocationReports.length}</b>{" "}
            unlocated
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <b className="font-semibold text-slate-300">{flaggedWards.length}</b> silent zones
          </span>
        </div>
      </div>

      {/* Lane tabs */}
      <div className="grid grid-cols-4 gap-1 border-b border-slate-800 bg-slate-900/40 p-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeLane === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLane(tab.id)}
              className={`flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{tab.label}</span>
              {laneCount(tab.id) > 0 && (
                <span
                  className={`rounded-full px-1 font-mono text-[9px] ${
                    active ? "bg-slate-700 text-slate-200" : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {laneCount(tab.id)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeLane === "queue" && (
        <>
          {/* Search & filters */}
          <div className="space-y-1.5 border-b border-slate-800 p-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search incidents or landmarks"
                className="w-full rounded-md border border-slate-800 bg-slate-900 py-1.5 pl-8 pr-2 text-xs text-white placeholder-slate-600 focus:border-slate-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <label className="flex cursor-pointer items-center gap-1.5 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={filterLifeRiskOnly}
                  onChange={(e) => setFilterLifeRiskOnly(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 accent-rose-500"
                />
                Life risks only
              </label>
              <span className="font-mono">
                {filteredIncidents.length} of {incidents.length}
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[10px]">
              <button
                onClick={() => setChannelFilter("all")}
                className={`flex-1 rounded px-1 py-1 font-medium transition-colors ${
                  channelFilter === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                All channels
              </button>
              <button
                onClick={() => setChannelFilter("primary_sources")}
                className={`flex flex-1 items-center justify-center gap-1 rounded px-1 py-1 font-medium transition-colors ${
                  channelFilter === "primary_sources"
                    ? "bg-blue-950 text-blue-200"
                    : "text-slate-500 hover:text-blue-300"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Sensors / official
              </button>
            </div>
          </div>

          {/* Ranked incident list */}
          <div className="flex-1 divide-y divide-slate-800/70 overflow-y-auto">
            {filteredIncidents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <Radio className="h-6 w-6 text-slate-700" />
                <p className="text-[11px] font-medium text-slate-400">
                  No incidents in the queue yet
                </p>
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Press Play or jump to a case in the top bar to begin processing reports.
                </p>
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = inc.id === selectedIncidentId;
                const scorePercent = Math.round(inc.urgency_score * 100);
                const b = inc.urgency_breakdown;

                return (
                  <button
                    key={inc.id}
                    onClick={() => {
                      selectIncident(inc.id);
                      window.dispatchEvent(
                        new CustomEvent("crisissignal:incident-selected")
                      );
                    }}
                    className={`block w-full p-3 text-left transition-colors hover:bg-slate-800/40 ${
                      isSelected
                        ? "border-l-2 border-l-sky-400 bg-slate-800/50"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${
                            inc.priority_rank <= 2
                              ? "border border-red-900/70 bg-red-950/60 text-red-300"
                              : inc.priority_rank <= 5
                              ? "border border-amber-900/70 bg-amber-950/60 text-amber-300"
                              : "border border-slate-700 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {inc.priority_rank}
                        </span>

                        {inc.rank_delta !== undefined && inc.rank_delta !== 0 && (
                          <span
                            className={`flex shrink-0 items-center font-mono text-[9px] ${
                              inc.rank_delta > 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                            title={`Rank moved ${inc.rank_delta > 0 ? "up" : "down"} by ${Math.abs(
                              inc.rank_delta
                            )}`}
                          >
                            {inc.rank_delta > 0 ? (
                              <ArrowUp className="h-2.5 w-2.5" />
                            ) : (
                              <ArrowDown className="h-2.5 w-2.5" />
                            )}
                            {Math.abs(inc.rank_delta)}
                          </span>
                        )}

                        <span className="truncate text-[12px] font-medium text-slate-200">
                          {inc.title}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          scorePercent >= 75
                            ? "border border-red-900/70 bg-red-950/60 text-red-300"
                            : scorePercent >= 50
                            ? "border border-amber-900/70 bg-amber-950/60 text-amber-300"
                            : "border border-slate-700 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {scorePercent}%
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px]">
                      <ProvenanceBadge provenance={inc.provenance} compact />

                      {inc.is_verify_urgently && (
                        <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 font-bold text-white">
                          <AlertTriangle className="h-2.5 w-2.5" /> Verify urgently
                        </span>
                      )}

                      {inc.fairness_boost_applied && (
                        <span className="flex items-center gap-1 rounded border border-purple-900/70 bg-purple-950/60 px-1.5 py-0.5 text-purple-300">
                          <Sparkles className="h-2.5 w-2.5" /> Fairness
                        </span>
                      )}

                      {inc.source_report_ids.length > 1 && (
                        <span className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-slate-400">
                          {inc.source_report_ids.length} reports
                        </span>
                      )}

                      <span
                        className={`rounded px-1.5 py-0.5 font-mono ${
                          inc.reliability_score >= 70
                            ? "bg-emerald-950/60 text-emerald-300"
                            : inc.reliability_score >= 45
                            ? "bg-slate-800 text-slate-400"
                            : "bg-rose-950/60 text-rose-300"
                        }`}
                      >
                        Rel {inc.reliability_score}
                      </span>

                      {inc.status === "dispatched" && (
                        <span className="rounded border border-sky-900/70 bg-sky-950/60 px-1.5 py-0.5 text-sky-300">
                          Dispatched
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        style={{ width: `${(b.life_risk_component / 0.3) * 30}%` }}
                        className="bg-red-500"
                        title={`Life risk: ${b.life_risk_component}`}
                      />
                      <div
                        style={{ width: `${(b.vulnerability_component / 0.2) * 20}%` }}
                        className="bg-orange-400"
                        title={`Vulnerability: ${b.vulnerability_component}`}
                      />
                      <div
                        style={{ width: `${(b.hazard_component / 0.15) * 15}%` }}
                        className="bg-amber-400"
                        title={`Hazard: ${b.hazard_component}`}
                      />
                      <div
                        style={{ width: `${(b.time_waiting_component / 0.15) * 15}%` }}
                        className="bg-blue-400"
                        title={`Wait time: ${b.time_waiting_component}`}
                      />
                      <div
                        style={{ width: `${(b.access_component / 0.1) * 10}%` }}
                        className="bg-purple-400"
                        title={`Access: ${b.access_component}`}
                      />
                      <div
                        style={{ width: `${(b.fairness_boost / 0.1) * 10}%` }}
                        className="bg-fuchsia-400"
                        title={`Fairness: ${b.fairness_boost}`}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span className="truncate">
                        {inc.people_count_display !== "Unknown"
                          ? inc.people_count_display
                          : "Count unknown"}
                        {inc.water_band ? ` · ${inc.water_band}` : ""}
                      </span>
                      <span className="ml-2 shrink-0">{inc.channels.join(", ")}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Lane: needs location */}
      {activeLane === "needs_location" && (
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
          <p className="text-[10px] leading-relaxed text-slate-500">
            Reports with no recognizable landmark in the gazetteer. The engine refuses
            to guess a location — assign a verified anchor after a call-back or radio
            confirmation.
          </p>

          {needsLocationReports.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-center">
              <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-emerald-500" />
              <p className="text-[11px] font-medium text-slate-300">
                All reports successfully anchored
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Nothing is waiting in this lane.
              </p>
            </div>
          ) : (
            needsLocationReports.map((rep) => (
              <div
                key={rep.id}
                className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3"
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                  <span className="font-semibold text-amber-300">{rep.id}</span>
                  <span>{rep.raw.channel}</span>
                </div>
                <p className="rounded border border-slate-800 bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-200">
                  &quot;{rep.raw.raw_text}&quot;
                </p>
                <p className="flex items-start gap-1.5 text-[10px] text-slate-500">
                  <MapPinOff className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                  {rep.location.notes || "No landmark matched in the gazetteer."}
                </p>
                <button
                  onClick={() => setSelectedReportForLoc(rep.id)}
                  className="w-full rounded-md border border-amber-800/70 bg-amber-950/40 py-1 text-[10px] font-medium text-amber-200 transition-colors hover:bg-amber-900/40"
                >
                  Assign location anchor
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lane: suggested merges */}
      {activeLane === "suggested_merges" && (
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
          <p className="text-[10px] leading-relaxed text-slate-500">
            Candidates with 55–75% overlap. Similar vicinity and timing, but with minor
            attribute disagreements — the coordinator decides whether to merge.
          </p>

          {suggestedMerges.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-center">
              <CheckCircle2 className="mx-auto mb-1.5 h-5 w-5 text-blue-500" />
              <p className="text-[11px] font-medium text-slate-300">
                No ambiguous merges pending
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                High-confidence duplicates were auto-merged; incompatible emergencies
                were kept separate.
              </p>
            </div>
          ) : (
            suggestedMerges.map((sug) => {
              const incA = incidents.find((i) => i.id === sug.incident_a_id);
              return (
                <div
                  key={sug.id}
                  className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-300">
                      <GitMerge className="h-3 w-3" />
                      {Math.round(sug.confidence * 100)}% match
                    </span>
                    <span className="font-mono text-[9px] text-slate-500">
                      {sug.suggested_at.slice(5, 16).replace("T", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="rounded border border-slate-800 bg-slate-950 p-2">
                      <p className="mb-0.5 text-slate-500">Target incident</p>
                      <p className="truncate font-medium text-slate-200">
                        {incA?.title || sug.incident_a_id}
                      </p>
                      <p className="text-slate-600">
                        {incA?.source_report_ids.length} reports
                      </p>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-950 p-2">
                      <p className="mb-0.5 text-slate-500">Incoming</p>
                      <p className="truncate font-medium text-slate-200">
                        Report {sug.incident_b_id}
                      </p>
                      <p className="text-slate-600">Awaiting decision</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    {sug.overlap_reasons.map((r, i) => (
                      <p key={i} className="flex items-start gap-1 text-emerald-400/90">
                        <ArrowRight className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                        {r}
                      </p>
                    ))}
                    {sug.conflicts.map((c, i) => (
                      <p key={i} className="flex items-start gap-1 text-amber-400/90">
                        <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                        {c}
                      </p>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const reason = window.prompt("Reason for confirming merge:");
                      if (reason) confirmSuggestedMerge(sug.id, reason);
                    }}
                    className="w-full rounded-md border border-blue-800/70 bg-blue-950/40 py-1 text-[10px] font-medium text-blue-200 transition-colors hover:bg-blue-900/40"
                  >
                    Confirm merge
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Lane: silent zones */}
      {activeLane === "silent_zones" && (
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
          <p className="text-[10px] leading-relaxed text-slate-500">
            Wards with a silence score ≥ 0.60: quiet areas with high flood exposure and
            vulnerability, but few or zero reports. Prompt for human attention — never
            auto-converted into incidents.
          </p>

          {flaggedWards.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-center">
              <ShieldAlert className="mx-auto mb-1.5 h-5 w-5 text-slate-600" />
              <p className="text-[11px] font-medium text-slate-300">
                No silent zones flagged
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                No ward has crossed the silence threshold at this replay time.
              </p>
            </div>
          ) : (
            flaggedWards.map((w) => (
              <div
                key={w.id}
                className="space-y-2.5 rounded-lg border border-purple-900/50 bg-purple-950/10 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-[11px] font-semibold text-white">
                      {w.name} <span className="font-mono text-[9px] text-slate-500">({w.code})</span>
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {w.population.toLocaleString()} people · {w.area_sq_km} km²
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-purple-300">
                    {w.silence_score.toFixed(2)}
                  </span>
                </div>

                <ul className="space-y-0.5 text-[10px] text-purple-200/80">
                  {w.silence_reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-purple-500">•</span>
                      {r}
                    </li>
                  ))}
                </ul>

                {w.welfare_check_assigned ? (
                  <p className="rounded border border-emerald-900/60 bg-emerald-950/40 p-1.5 text-[10px] text-emerald-300">
                    Welfare check assigned — {w.welfare_check_assigned.action_type}
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      const notes = window.prompt("Dispatch instructions for welfare check:");
                      if (notes !== null) {
                        assignWelfareCheck(
                          w.id,
                          "boat_patrol",
                          notes || "Routine reconnaissance",
                          "Welfare check assigned from Silent Zones lane"
                        );
                      }
                    }}
                    className="w-full rounded-md border border-purple-800/70 bg-purple-950/40 py-1 text-[10px] font-medium text-purple-200 transition-colors hover:bg-purple-900/40"
                  >
                    Assign welfare check
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="border-t border-slate-800/70 px-3 py-1.5 text-[9px] leading-relaxed text-slate-600">
        Historical replay on real 2022 flood dates, 100% synthetic events. Dispatch
        actions are simulated.
      </div>

      {/* Manual location assignment modal */}
      {selectedReportForLoc && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0b1120] p-5 text-xs shadow-2xl">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4 text-amber-400" /> Assign location anchor
            </h3>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
              Anchor this unlocated report to a known landmark based on call-back or
              field confirmation.
            </p>

            <form onSubmit={handleManualLocationSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-300">
                  Landmark anchor
                </label>
                <select
                  value={chosenLandmarkId}
                  onChange={(e) => setChosenLandmarkId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                >
                  {BENGALURU_LANDMARKS.map((lm) => (
                    <option key={lm.id} value={lm.id}>
                      {lm.name} ({lm.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-300">
                  Coordinator reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={locReason}
                  onChange={(e) => setLocReason(e.target.value)}
                  placeholder="e.g. Spoke with reporter on telephone call-back; confirmed they are adjacent to..."
                  rows={2}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedReportForLoc(null)}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-500"
                >
                  Confirm anchor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
