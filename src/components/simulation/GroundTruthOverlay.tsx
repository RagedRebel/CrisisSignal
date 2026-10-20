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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm"
      onClick={() => setShowGroundTruth(false)}
    >
      <div
        className="max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-purple-500" />
            <span>Ground Truth Benchmark Verification</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Compare live engine prioritization directly against labelled true incident groups and silent zones.
          </p>
        </div>

        <button
          onClick={() => setShowGroundTruth(false)}
          className="rounded p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* True Priority Table */}
        <div className="space-y-2">
          <h4 className="border-b border-slate-200 pb-1 text-xs font-bold text-purple-700">
            News-Backbone Ground Truth Incidents &amp; True Urgency
          </h4>

          <div className="space-y-2">
            {GROUND_TRUTH_INCIDENTS.map((gt) => {
              // Find matching incident currently in queue
              const matched = incidents.find((i) =>
                i.source_report_ids.some((rid) => gt.report_ids.includes(rid))
              );
              const previewIds =
                gt.report_ids.slice(0, 8).join(", ") +
                (gt.report_ids.length > 8 ? ` +${gt.report_ids.length - 8} more` : "");

              return (
                <div
                  key={gt.id}
                  className="space-y-1 rounded border border-slate-200 bg-white p-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {gt.id.toUpperCase()} · {gt.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-purple-600">
                      True Rank #{gt.true_priority_rank}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">{gt.notes}</p>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1 text-[10px]">
                    <span
                      className="min-w-0 truncate font-mono text-slate-500"
                      title={gt.report_ids.join(", ")}
                    >
                      Source reports: {previewIds}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-bold text-primary">
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
          <h4 className="border-b border-slate-200 pb-1 text-xs font-bold text-purple-700">
            Ground Truth Silent Zones (Reported Need vs Silence)
          </h4>

          <div className="space-y-2">
            {GROUND_TRUTH_SILENT_ZONES.map((sz) => {
              const ward = wards.find((w) => w.id === sz.ward_id);

              return (
                <div
                  key={sz.ward_id}
                  className="space-y-1.5 rounded border border-purple-200 bg-purple-50/30 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{ward?.name || sz.ward_id}</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ward?.is_flagged_silent
                          ? "border border-purple-200 bg-purple-50 text-purple-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ward?.is_flagged_silent ? "✓ FLAGGED SILENT" : "Not Flagged"}
                    </span>
                  </div>

                  <p className="text-[11px] text-purple-700">
                    Failure mode: <b>{sz.failure_mode}</b>
                  </p>

                  <div className="text-[10px] text-slate-500">
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
