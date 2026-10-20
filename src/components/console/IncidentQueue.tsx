"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import {
  AlertTriangle,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  ArrowUp,
  ArrowDown,
  Sparkles,
  MapPinOff,
  FileQuestion,
  GitMerge,
  ShieldAlert,
} from "lucide-react";

export function IncidentQueue() {
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
  } = useCrisisStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLifeRiskOnly, setFilterLifeRiskOnly] = useState(false);

  // Counts for lane tabs
  const needsLocationCount = processedReports.filter((p) => p.location.needs_location_lane).length;
  const needsReadingCount = processedReports.filter((p) => p.extraction_status === "needs_human_reading").length;
  const suggestedMergesCount = suggestedMerges.length;
  const silentZonesCount = wards.filter((w) => w.is_flagged_silent).length;

  const filteredIncidents = incidents.filter((inc) => {
    if (
      channelFilter === "primary_sources" &&
      !inc.channels.some((channel) => channel === "sensor" || channel === "official")
    ) {
      return false;
    }
    if (searchTerm) {
      const matchTitle = inc.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLandmark = inc.location.landmark_name?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchTitle && !matchLandmark) return false;
    }
    if (filterLifeRiskOnly && inc.life_risk === "none_stated") {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col border-r border-border bg-[#090d16] text-xs">
      {/* Lanes Tab Bar */}
      <div className="flex border-b border-border bg-slate-900/60 p-1 gap-1 text-[11px] overflow-x-auto">
        <button
          onClick={() => setActiveLane("queue")}
          className={`flex items-center gap-1 rounded px-2 py-1 font-semibold transition ${
            activeLane === "queue"
              ? "bg-primary text-slate-950 font-bold"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <span>Queue</span>
          <span className="rounded-full bg-slate-950/40 px-1 text-[10px]">{incidents.length}</span>
        </button>

        <button
          onClick={() => setActiveLane("needs_location")}
          className={`flex items-center gap-1 rounded px-2 py-1 transition ${
            activeLane === "needs_location"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <MapPinOff className="h-3 w-3" />
          <span>Needs Location</span>
          {needsLocationCount > 0 && (
            <span className="rounded-full bg-amber-500/30 text-amber-300 px-1 text-[10px] font-bold">
              {needsLocationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveLane("suggested_merges")}
          className={`flex items-center gap-1 rounded px-2 py-1 transition ${
            activeLane === "suggested_merges"
              ? "bg-blue-600 text-white font-bold"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <GitMerge className="h-3 w-3" />
          <span>Merges</span>
          {suggestedMergesCount > 0 && (
            <span className="rounded-full bg-blue-500/30 text-blue-300 px-1 text-[10px] font-bold">
              {suggestedMergesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveLane("silent_zones")}
          className={`flex items-center gap-1 rounded px-2 py-1 transition ${
            activeLane === "silent_zones"
              ? "bg-purple-600 text-white font-bold"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ShieldAlert className="h-3 w-3" />
          <span>Silent</span>
          {silentZonesCount > 0 && (
            <span className="rounded-full bg-purple-500/30 text-purple-300 px-1 text-[10px] font-bold">
              {silentZonesCount}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter Header */}
      <div className="border-b border-border p-2 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search landmarks or incidents..."
            className="w-full rounded bg-slate-900 border border-slate-800 py-1 pl-8 pr-2 text-xs text-white placeholder-slate-500 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
            <input
              type="checkbox"
              checked={filterLifeRiskOnly}
              onChange={(e) => setFilterLifeRiskOnly(e.target.checked)}
              className="rounded border-slate-700 text-red-500 focus:ring-0"
            />
            <span>Severe life risks only</span>
          </label>

          <span className="font-mono text-slate-500">
            {filteredIncidents.length} of {incidents.length}
          </span>
        </div>

        {/* Channel Filter Toggle */}
        <div className="flex items-center gap-1 rounded bg-slate-950 p-0.5 border border-slate-800 text-[10px]">
          <button
            onClick={() => setChannelFilter("all")}
            className={`flex-1 py-0.5 rounded font-semibold transition ${
              channelFilter === "all"
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            All Channels
          </button>
          <button
            onClick={() => setChannelFilter("primary_sources")}
            className={`flex-1 py-0.5 rounded font-semibold transition flex items-center justify-center gap-1 ${
              channelFilter === "primary_sources"
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-blue-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Sensors / Official
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filteredIncidents.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-slate-500">
            <Radio className="h-8 w-8 text-slate-700 animate-pulse mb-2" />
            <p className="font-medium">No incidents in queue yet</p>
            <p className="text-[11px] text-slate-600">
              Click &quot;Play&quot; on the top bar or &quot;Jump to Case&quot; to begin processing flood reports.
            </p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = inc.id === selectedIncidentId;
            const scorePercent = Math.round(inc.urgency_score * 100);
            const b = inc.urgency_breakdown;

            return (
              <div
                key={inc.id}
                onClick={() => selectIncident(inc.id)}
                className={`p-2.5 transition-all cursor-pointer hover:bg-slate-800/50 ${
                  isSelected ? "bg-slate-800/90 border-l-4 border-l-primary" : ""
                }`}
              >
                {/* Header: Rank, Title, Score */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono font-bold text-[11px] ${
                        inc.priority_rank <= 2
                          ? "bg-red-500/20 text-red-400 border border-red-500/50"
                          : inc.priority_rank <= 5
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      #{inc.priority_rank}
                    </span>

                    {/* Rank delta arrow */}
                    {inc.rank_delta !== undefined && inc.rank_delta !== 0 && (
                      <span
                        className={`flex items-center text-[10px] font-mono ${
                          inc.rank_delta > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                        title={`Rank moved ${inc.rank_delta > 0 ? `up +${inc.rank_delta}` : `down ${inc.rank_delta}`}`}
                      >
                        {inc.rank_delta > 0 ? (
                          <ArrowUp className="h-2.5 w-2.5" />
                        ) : (
                          <ArrowDown className="h-2.5 w-2.5" />
                        )}
                        {Math.abs(inc.rank_delta)}
                      </span>
                    )}

                    <h4 className="font-semibold text-slate-200 truncate text-xs">{inc.title}</h4>
                  </div>

                  {/* Urgency Score Pill */}
                  <div
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold shrink-0 ${
                      scorePercent >= 75
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : scorePercent >= 50
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-blue-950 text-blue-400 border border-blue-800"
                    }`}
                  >
                    {scorePercent}%
                  </div>
                </div>

                {/* Badges Bar (VERIFY URGENTLY, Fairness Boost, Merged from N) */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                  <ProvenanceBadge provenance={inc.provenance} compact />

                  {inc.is_verify_urgently && (
                    <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 font-bold text-white shadow-sm animate-pulse">
                      <AlertTriangle className="h-3 w-3" /> VERIFY URGENTLY
                    </span>
                  )}

                  {inc.fairness_boost_applied && (
                    <span className="flex items-center gap-1 rounded bg-purple-950 border border-purple-600 px-1.5 py-0.5 font-semibold text-purple-300">
                      <Sparkles className="h-3 w-3 text-purple-400" /> +Fairness Boost
                    </span>
                  )}

                  {inc.source_report_ids.length > 1 && (
                    <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-slate-300 font-mono">
                      Merged from {inc.source_report_ids.length} reports
                    </span>
                  )}

                  {/* Reliability Chip */}
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono ${
                      inc.reliability_score >= 70
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                        : inc.reliability_score >= 45
                        ? "bg-slate-800 text-slate-300"
                        : "bg-rose-950/80 text-rose-300 border border-rose-800"
                    }`}
                  >
                    Rel: {inc.reliability_score}/100
                  </span>

                  {inc.status === "dispatched" && (
                    <span className="rounded bg-sky-950 border border-sky-700 text-sky-300 px-1.5 py-0.5 font-semibold">
                      Dispatched
                    </span>
                  )}
                </div>

                {/* Mini Stacked Factor Breakdown Bar */}
                <div className="mt-2 space-y-1">
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                    <div
                      style={{ width: `${(b.life_risk_component / 0.3) * 30}%` }}
                      className="bg-red-500"
                      title={`Life Risk: ${b.life_risk_component}`}
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
                      title={`Wait Time: ${b.time_waiting_component}`}
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
                </div>

                {/* Subtitle Facts */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    {inc.people_count_display !== "Unknown" ? `👥 ${inc.people_count_display}` : "👥 Count unknown"}
                    {inc.water_band ? ` • 🌊 ${inc.water_band}` : ""}
                  </span>
                  <span>{inc.channels.join(", ")}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
