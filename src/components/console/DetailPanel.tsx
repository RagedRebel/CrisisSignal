"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import {
  AlertTriangle,
  Send,
  Sliders,
  XCircle,
  Split,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  CheckCircle,
  FileText,
  MapPin,
  Clock,
  Layers,
  PhoneCall,
  UserCheck,
  Flame,
} from "lucide-react";

export function DetailPanel() {
  const {
    incidents,
    selectedIncidentId,
    processedReports,
    overrideIncidentPriority,
    simulateDispatch,
    markFalseAlarm,
    splitIncident,
  } = useCrisisStore();

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState(0.8);
  const [overrideReason, setOverrideReason] = useState("");
  const [dispatchUnits, setDispatchUnits] = useState("SDRF Inflatable Boat Unit 2 + 4 Paramdics");
  const [dispatchInstructions, setDispatchInstructions] = useState("Approach via north bund; watch for submerged electrical wires");
  const [dispatchReason, setDispatchReason] = useState("Critical life risk confirmed by on-ground scout");

  const incident = incidents.find((i) => i.id === selectedIncidentId);

  if (!incident) {
    return (
      <div className="flex h-full flex-col items-center justify-center border-l border-border bg-[#090d16] p-6 text-center text-slate-500 text-xs">
        <FileText className="h-8 w-8 text-slate-700 mb-2" />
        <h4 className="font-semibold text-slate-400">No Incident Selected</h4>
        <p className="mt-1 text-[11px] text-slate-500">
          Click on any incident card from the queue or a pin on the tactical map to inspect its explainability breakdown and provenance.
        </p>
      </div>
    );
  }

  // Find all raw reports that contributed to this incident
  const contributingReports = processedReports.filter((p) =>
    incident.source_report_ids.includes(p.id)
  );

  const b = incident.urgency_breakdown;
  const scorePercent = Math.round(incident.urgency_score * 100);

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    overrideIncidentPriority(incident.id, overrideScore, overrideReason);
    setOverrideModalOpen(false);
    setOverrideReason("");
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchReason.trim()) return;
    simulateDispatch(incident.id, dispatchUnits, dispatchInstructions, dispatchReason);
    setDispatchModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-[#090d16] text-xs overflow-y-auto">
      {/* Incident Header & Rank */}
      <div className="border-b border-border bg-slate-900/70 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="rounded bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 font-mono font-bold text-xs">
                Priority Rank #{incident.priority_rank}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                ID: {incident.id}
              </span>
              <ProvenanceBadge provenance={incident.provenance} compact />
            </div>
            <h3 className="font-bold text-white text-sm leading-tight">{incident.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                {incident.location.landmark_name || "Zone"} (±{incident.location.uncertainty_radius_m}m)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                Updated {new Date(incident.updated_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Urgency Score Pill */}
          <div className="flex flex-col items-end">
            <span className="font-mono text-2xl font-black text-primary">
              {scorePercent}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Urgency Score</span>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-2.5">
          <button
            onClick={() => setDispatchModalOpen(true)}
            className="flex items-center gap-1.5 rounded bg-sky-600 hover:bg-sky-500 px-3 py-1 font-semibold text-white shadow transition"
          >
            <Send className="h-3 w-3" /> Simulate Dispatch
          </button>

          <button
            onClick={() => setOverrideModalOpen(true)}
            className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-slate-200 border border-slate-700 transition"
          >
            <Sliders className="h-3 w-3" /> Override Rank
          </button>

          <button
            onClick={() => {
              const reason = window.prompt("Reason for marking as false alarm:");
              if (reason) markFalseAlarm(incident.id, reason);
            }}
            className="flex items-center gap-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 px-2.5 py-1 text-rose-300 transition"
          >
            <XCircle className="h-3 w-3" /> Mark False
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* "VERIFY URGENTLY" Banner */}
        {incident.is_verify_urgently && (
          <div className="rounded-lg border-2 border-red-500 bg-red-950/60 p-3 text-red-200 shadow-lg">
            <div className="flex items-center gap-2 font-bold text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
              <span>VERIFY URGENTLY: Low Reliability Severe Report</span>
            </div>
            <p className="mt-1 text-xs text-red-200/90 leading-relaxed">
              {incident.verify_urgently_reason}
            </p>
            {incident.suggested_verification && (
              <div className="mt-2 rounded bg-black/40 border border-red-900/60 p-2 text-[11px] text-red-300 flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span>
                  <b>Suggested Action:</b> {incident.suggested_verification}
                </span>
              </div>
            )}
          </div>
        )}

        {/* "Why #1" Panel — Transparent Explainability */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Explainability: &quot;Why is this #{incident.priority_rank}?&quot;
            </h4>
            <span className="font-mono text-[10px] text-slate-400">Deterministic Logic</span>
          </div>

          {/* Stacked Factor Breakdown Bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-medium">Life Risk Factor (30% max)</span>
                <span className="font-mono text-red-400">
                  +{(b.life_risk_component * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(b.life_risk_component / 0.3) * 100}%` }}
                  className="h-full bg-red-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-medium">Vulnerable Groups & Ward (20% max)</span>
                <span className="font-mono text-orange-400">
                  +{(b.vulnerability_component * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(b.vulnerability_component / 0.2) * 100}%` }}
                  className="h-full bg-orange-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-medium">Hazard Severity & Surge (15% max)</span>
                <span className="font-mono text-amber-400">
                  +{(b.hazard_component * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(b.hazard_component / 0.15) * 100}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-medium">Time Waiting Curve (15% max)</span>
                <span className="font-mono text-blue-400">
                  +{(b.time_waiting_component * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(b.time_waiting_component / 0.15) * 100}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-medium">Access Difficulty (10% max)</span>
                <span className="font-mono text-purple-400">
                  +{(b.access_component * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(b.access_component / 0.1) * 100}%` }}
                  className="h-full bg-purple-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300 font-medium">Report Reliability (10% max)</span>
                <span className="font-mono text-emerald-400">
                  +{(b.reliability_component * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(b.reliability_component / 0.1) * 100}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Fairness Boost Bar */}
            {incident.fairness_boost_applied && (
              <div className="rounded bg-purple-950/60 border border-purple-800 p-2 mt-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-400" /> Fairness Boost (Equity Layer)
                  </span>
                  <span className="font-mono font-bold text-purple-300">
                    +{(b.fairness_boost * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-purple-200/90 leading-tight">
                  {incident.fairness_boost_reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reliability Breakdown Panel */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs">Reliability Assessment</h4>
            <span className="font-mono font-bold text-primary">
              {incident.reliability_score} / 100
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            {incident.reliability_reasons.pro.map((pro, i) => (
              <div key={i} className="flex items-start gap-1.5 text-emerald-300">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                <span>{pro}</span>
              </div>
            ))}
            {incident.reliability_reasons.con.map((con, i) => (
              <div key={i} className="flex items-start gap-1.5 text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                <span>{con}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmed Facts vs Unknowns */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-2.5 space-y-1">
            <h5 className="font-bold text-emerald-400 text-[11px] flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Confirmed Facts
            </h5>
            <ul className="text-[11px] text-slate-300 space-y-0.5">
              {incident.confirmed_facts.length > 0 ? (
                incident.confirmed_facts.map((fact, i) => <li key={i}>• {fact}</li>)
              ) : (
                <li className="italic text-slate-500">None confirmed</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 space-y-1">
            <h5 className="font-bold text-slate-400 text-[11px] flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Unknowns / Unstated
            </h5>
            <ul className="text-[11px] text-slate-400 space-y-0.5">
              {incident.unknown_fields.length > 0 ? (
                incident.unknown_fields.map((field, i) => (
                  <li key={i}>• {field}: <span className="italic text-slate-500">Unknown</span></li>
                ))
              ) : (
                <li className="italic text-slate-500">All key fields populated</li>
              )}
            </ul>
          </div>
        </div>

        {/* Contributing Raw Reports & Highlighted Evidence Spans */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Source Messages & Evidence Spans ({contributingReports.length})
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Auditable Provenance</span>
          </div>

          <div className="space-y-3">
            {contributingReports.map((proc) => {
              const spans = proc.extracted.evidence_spans;

              return (
                <div
                  key={proc.id}
                  className="rounded border border-slate-800 bg-slate-950 p-2.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1">
                    <span className="font-mono text-slate-300 font-bold">{proc.id}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                      Channel: {proc.raw.channel}
                    </span>
                    <ProvenanceBadge provenance={proc.provenance} compact />
                    <span>{new Date(proc.raw.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* Raw Text with Highlighted Spans */}
                  <p className="text-slate-200 text-xs leading-relaxed bg-slate-900/50 p-2 rounded border border-slate-800/60 font-sans">
                    &quot;{proc.raw.raw_text}&quot;
                  </p>

                  {/* Extracted Evidence Chips */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {Object.entries(spans).map(([key, ev]) => (
                      <span
                        key={key}
                        className="rounded bg-sky-950 border border-sky-800 text-sky-300 px-1.5 py-0.5"
                        title={`Evidence for field "${key}" (confidence ${Math.round(ev.confidence * 100)}%)`}
                      >
                        <b>{key}:</b> &quot;{ev.text}&quot;
                      </span>
                    ))}
                  </div>

                  {/* Split Button if merged incident */}
                  {incident.source_report_ids.length > 1 && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          const reason = window.prompt("Reason for splitting this report out:");
                          if (reason) splitIncident(incident.id, proc.id, reason);
                        }}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400"
                      >
                        <Split className="h-3 w-3" /> Split into separate emergency
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Override Priority Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-[#0f172a] p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Sliders className="h-4 w-4 text-primary" /> Coordinator Priority Override
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Coordinators maintain ultimate command authority. All overrides require an audit reason and will immediately re-rank the incident queue.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Urgency Score Override: {Math.round(overrideScore * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Override <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Police wireless confirmed higher water surge; escalating priority..."
                  rows={3}
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-primary hover:bg-sky-400 px-4 py-1.5 text-xs font-semibold text-slate-950"
                >
                  Confirm & Re-rank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulate Dispatch Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-[#0f172a] p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Send className="h-4 w-4 text-sky-400" /> Confirm Simulated Dispatch
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              This action simulates emergency unit tasking recorded in the local audit log. Nothing is dispatched in the real world.
            </p>

            <form onSubmit={handleDispatchSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Units
                </label>
                <input
                  type="text"
                  value={dispatchUnits}
                  onChange={(e) => setDispatchUnits(e.target.value)}
                  className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tactical Instructions
                </label>
                <input
                  type="text"
                  value={dispatchInstructions}
                  onChange={(e) => setDispatchInstructions(e.target.value)}
                  className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Coordinator Reason / Log Entry <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={dispatchReason}
                  onChange={(e) => setDispatchReason(e.target.value)}
                  placeholder="e.g. Life risk verified; water level crossing chest band..."
                  rows={2}
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-sky-600 hover:bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
