"use client";

import React from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { GROUND_TRUTH_INCIDENTS, GROUND_TRUTH_SILENT_ZONES } from "@/data/groundTruth";
import { X, CheckCircle, ShieldAlert } from "lucide-react";

export function GroundTruthOverlay() {
  const { showGroundTruth, setShowGroundTruth, incidents, wards } = useCrisisStore();

  if (!showGroundTruth) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setShowGroundTruth(false)}
    >
      <div
        className="max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1120] p-5 text-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-purple-400" />
            <span>Ground Truth Benchmark Verification</span>
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Compare live engine prioritization directly against labelled true incident groups and silent zones.
          </p>
        </div>

        <button
          onClick={() => setShowGroundTruth(false)}
          className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* True Priority Table */}
        <div className="space-y-2">
          <h4 className="font-bold text-purple-300 text-xs border-b border-slate-800 pb-1">
            News-Backbone Ground Truth Incidents &amp; True Urgency
          </h4>

          <div className="space-y-2">
            {GROUND_TRUTH_INCIDENTS.map((gt) => {
              // Find matching incident currently in queue
              const matched = incidents.find((i) =>
                i.source_report_ids.some((rid) => gt.report_ids.includes(rid))
              );

              return (
                <div
                  key={gt.id}
                  className="rounded border border-slate-800 bg-slate-900/80 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {gt.id.toUpperCase()} · {gt.name}
                    </span>
                    <span className="font-mono text-purple-300 text-[10px]">
                      True Rank #{gt.true_priority_rank}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">{gt.notes}</p>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                    <span className="text-slate-500 font-mono">
                      Source reports: {gt.report_ids.join(", ")}
                    </span>
                    <span className="font-bold text-primary">
                      {matched ? `Engine Priority: #${matched.priority_rank}` : "Not in queue"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* True Silent Zones */}
        <div className="space-y-2">
          <h4 className="font-bold text-purple-300 text-xs border-b border-slate-800 pb-1">
            Ground Truth Silent Zones (Reported Need vs Silence)
          </h4>

          <div className="space-y-2">
            {GROUND_TRUTH_SILENT_ZONES.map((sz) => {
              const ward = wards.find((w) => w.id === sz.ward_id);

              return (
                <div
                  key={sz.ward_id}
                  className="rounded border border-purple-900/40 bg-slate-900/80 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{ward?.name || sz.ward_id}</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ward?.is_flagged_silent
                          ? "bg-purple-950 text-purple-300 border border-purple-700"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {ward?.is_flagged_silent ? "✓ FLAGGED SILENT" : "Not Flagged"}
                    </span>
                  </div>

                  <p className="text-[11px] text-purple-200">
                    Failure mode: <b>{sz.failure_mode}</b>
                  </p>

                  <div className="text-[10px] text-slate-400">
                    Current Silence Score: <b>{ward?.silence_score.toFixed(2)}</b> (Threshold: 0.60)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
