"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import {
  MapPinOff,
  FileQuestion,
  GitMerge,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { BENGALURU_LANDMARKS } from "@/data/landmarks";

export function Lanes() {
  const {
    activeLane,
    setActiveLane,
    processedReports,
    suggestedMerges,
    incidents,
    wards,
    confirmSuggestedMerge,
    resolveReportLocationManually,
    assignWelfareCheck,
  } = useCrisisStore();

  const [selectedReportForLoc, setSelectedReportForLoc] = useState<string | null>(null);
  const [chosenLandmarkId, setChosenLandmarkId] = useState(BENGALURU_LANDMARKS[0].id);
  const [locReason, setLocReason] = useState("");

  const needsLocationReports = processedReports.filter((p) => p.location.needs_location_lane);
  const needsReadingReports = processedReports.filter(
    (p) => p.extraction_status === "needs_human_reading"
  );
  const flaggedWards = wards.filter((w) => w.is_flagged_silent);

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForLoc || !locReason.trim()) return;
    const lm = BENGALURU_LANDMARKS.find((l) => l.id === chosenLandmarkId) || BENGALURU_LANDMARKS[0];
    resolveReportLocationManually(selectedReportForLoc, lm.coords, lm.name, locReason);
    setSelectedReportForLoc(null);
    setLocReason("");
  };

  if (activeLane === "queue") return null;

  return (
    <div className="absolute inset-x-0 bottom-0 top-[88px] z-30 flex flex-col bg-[#090d16]/95 backdrop-blur-md p-6 text-xs overflow-y-auto">
      {/* Lanes Navigation Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveLane("queue")}
            className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 font-semibold"
          >
            ← Back to Ranked Queue
          </button>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {activeLane === "needs_location" && (
              <>
                <MapPinOff className="h-5 w-5 text-amber-400" />
                <span>Needs Location Lane ({needsLocationReports.length})</span>
              </>
            )}
            {activeLane === "suggested_merges" && (
              <>
                <GitMerge className="h-5 w-5 text-blue-400" />
                <span>Suggested Merges Lane ({suggestedMerges.length})</span>
              </>
            )}
            {activeLane === "silent_zones" && (
              <>
                <ShieldAlert className="h-5 w-5 text-purple-400" />
                <span>Silent Zones Attention Lane ({flaggedWards.length})</span>
              </>
            )}
          </h2>
        </div>

        <p className="text-slate-400 text-xs italic">
          Human-in-the-loop triage: Unresolvable items are routed here, never silently dropped or guessed.
        </p>
      </div>

      {/* Lane 1: Needs Location */}
      {activeLane === "needs_location" && (
        <div className="space-y-4 max-w-4xl">
          <p className="text-slate-300 text-xs">
            These raw reports contain no recognizable landmark anchors in the Bengaluru gazetteer. The engine refused to place a guessed pin. Coordinators can assign a verified location anchor based on phone callback or radio contact.
          </p>

          {needsLocationReports.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">All reports successfully anchored</p>
              <p className="text-[11px] text-slate-500">No reports currently waiting in the Needs Location lane.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {needsLocationReports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-lg border border-amber-900/40 bg-slate-900/80 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-mono font-bold text-amber-400">{rep.id}</span>
                    <span>Channel: {rep.raw.channel}</span>
                    <span>{new Date(rep.raw.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <p className="text-white text-xs bg-slate-950 p-2.5 rounded border border-slate-800">
                    &quot;{rep.raw.raw_text}&quot;
                  </p>

                  <div className="text-[11px] text-amber-300/90 flex items-center gap-1">
                    <MapPinOff className="h-3.5 w-3.5" />
                    <span>Engine notes: {rep.location.notes || "No landmark matched in gazetteer."}</span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setSelectedReportForLoc(rep.id)}
                      className="rounded bg-amber-600 hover:bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950"
                    >
                      Assign Location Anchor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lane 2: Suggested Merges */}
      {activeLane === "suggested_merges" && (
        <div className="space-y-4 max-w-4xl">
          <p className="text-slate-300 text-xs">
            These candidates have 55% - 75% overlap score (similar vicinity or timing, but with minor attribute disagreements). The coordinator decides whether to merge or keep separate.
          </p>

          {suggestedMerges.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No ambiguous merges pending</p>
              <p className="text-[11px] text-slate-500">High-confidence duplicates were auto-merged; incompatible emergencies were kept separate.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {suggestedMerges.map((sug) => {
                const incA = incidents.find((i) => i.id === sug.incident_a_id);
                return (
                  <div
                    key={sug.id}
                    className="rounded-lg border border-blue-900/50 bg-slate-900/80 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400 flex items-center gap-1.5">
                        <GitMerge className="h-4 w-4" /> Merge Candidate Confidence:{" "}
                        {Math.round(sug.confidence * 100)}%
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Suggested at {sug.suggested_at}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                        <h5 className="font-bold text-slate-300 mb-1">Target Incident</h5>
                        <p className="text-primary font-semibold">{incA?.title || sug.incident_a_id}</p>
                        <p className="text-[11px] text-slate-400">
                          {incA?.source_report_ids.length} existing reports
                        </p>
                      </div>

                      <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
                        <h5 className="font-bold text-slate-300 mb-1">Incoming Candidate</h5>
                        <p className="text-white font-semibold">Report #{sug.incident_b_id}</p>
                        <p className="text-[11px] text-slate-400">Awaiting merge confirmation</p>
                      </div>
                    </div>

                    {/* Overlap & Conflict reasons */}
                    <div className="space-y-1 text-[11px]">
                      {sug.overlap_reasons.map((r, i) => (
                        <div key={i} className="text-emerald-400 flex items-center gap-1">
                          ✓ {r}
                        </div>
                      ))}
                      {sug.conflicts.map((c, i) => (
                        <div key={i} className="text-amber-400 flex items-center gap-1">
                          ⚠️ {c}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          const reason = window.prompt("Reason for confirming merge:");
                          if (reason) confirmSuggestedMerge(sug.id, reason);
                        }}
                        className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 font-semibold text-white"
                      >
                        Confirm Merge
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lane 3: Silent Zones */}
      {activeLane === "silent_zones" && (
        <div className="space-y-4 max-w-4xl">
          <p className="text-slate-300 text-xs">
            Wards flagged by the Silence Layer with a score ≥ 0.60. These are quiet areas with high physical flood exposure and vulnerability, but few or zero reports due to digital divide, poverty, or infrastructure outages.
          </p>

          <div className="grid gap-3">
            {flaggedWards.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-purple-500/50 bg-purple-950/20 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {w.name} ({w.code})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Population: {w.population.toLocaleString()} • Area: {w.area_sq_km} km²
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xl font-bold text-purple-400">
                      {w.silence_score.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-purple-300 font-mono">Silence Score</p>
                  </div>
                </div>

                <div className="rounded bg-black/40 p-2.5 text-xs text-purple-200 space-y-1">
                  <h5 className="font-semibold text-purple-300 text-[11px]">
                    Anomaly Indicators:
                  </h5>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {w.silence_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {w.welfare_check_assigned ? (
                  <div className="rounded bg-emerald-950/60 border border-emerald-800 p-2 text-[11px] text-emerald-300">
                    ✓ Welfare check assigned: <b>{w.welfare_check_assigned.action_type}</b> by {w.welfare_check_assigned.assigned_by} at {w.welfare_check_assigned.assigned_at}
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
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
                      className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1 font-semibold text-white"
                    >
                      Assign Welfare Check
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Location Assignment Modal */}
      {selectedReportForLoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-[#0f172a] p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" /> Assign Location Anchor to Report
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Anchor this unlocated report to a known landmark based on call back or field confirmation.
            </p>

            <form onSubmit={handleManualLocationSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Landmark Anchor
                </label>
                <select
                  value={chosenLandmarkId}
                  onChange={(e) => setChosenLandmarkId(e.target.value)}
                  className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  {BENGALURU_LANDMARKS.map((lm) => (
                    <option key={lm.id} value={lm.id}>
                      {lm.name} ({lm.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Coordinator Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={locReason}
                  onChange={(e) => setLocReason(e.target.value)}
                  placeholder="e.g. Spoke with reporter on telephone callback; confirmed they are adjacent to..."
                  rows={2}
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReportForLoc(null)}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-amber-600 px-4 py-1.5 text-xs font-semibold text-slate-950"
                >
                  Confirm Anchor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
