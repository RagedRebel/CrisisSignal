"use client";

import React from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { computeFcfsRanking, computeLoudestFirstRanking } from "@/engine/simulation/baselines";
import { X, SlidersHorizontal, AlertTriangle, Sparkles } from "lucide-react";

export function BaselineComparison() {
  const { incidents, showBaselineComparison, setShowBaselineComparison } = useCrisisStore();

  if (!showBaselineComparison) return null;

  const fcfs = computeFcfsRanking(incidents);
  const loudest = computeLoudestFirstRanking(incidents);
  const crisissignalSorted = [...incidents].sort((a, b) => b.urgency_score - a.urgency_score);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setShowBaselineComparison(false)}
    >
      <div
        className="max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1120] p-5 text-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-blue-400" />
            <span>Live Baseline Comparison: CrisisSignal vs Standard Approaches</span>
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Demonstrates why traditional control room queues fail vulnerable populations during disasters.
          </p>
        </div>

        <button
          onClick={() => setShowBaselineComparison(false)}
          className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 3-Column Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: CrisisSignal Priority Engine (Our Solution) */}
        <div className="rounded-lg border-2 border-primary bg-slate-900/90 p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
              <Sparkles className="h-4 w-4 text-primary" /> CrisisSignal Engine (Ours)
            </span>
            <span className="rounded bg-primary/20 text-primary px-1.5 py-0.5 font-mono text-[10px]">
              Multi-factor + Fairness
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Life risk, vulnerability, waiting curve, and <b>Fairness Boost</b> for underserved zones.
          </p>

          <div className="space-y-1.5 divide-y divide-slate-800/60">
            {crisissignalSorted.slice(0, 7).map((inc, idx) => (
              <div key={inc.id} className="pt-1.5 flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-primary shrink-0">#{idx + 1}</span>
                  <div className="truncate">
                    <p className="font-semibold text-white truncate text-[11px]">{inc.title}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      {inc.is_verify_urgently && (
                        <span className="text-red-400 font-bold">⚠️ VERIFY URGENTLY</span>
                      )}
                      {inc.fairness_boost_applied && (
                        <span className="text-purple-300 font-semibold">+Fairness Boost</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="font-mono font-bold text-primary shrink-0">
                  {(inc.urgency_score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Loudest-Area-First (Social / Call Volume) */}
        <div className="rounded-lg border border-amber-900/60 bg-slate-900/90 p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-amber-400 text-xs">Loudest-Area-First (Baseline)</span>
            <span className="rounded bg-amber-950 text-amber-300 px-1.5 py-0.5 font-mono text-[10px]">
              Volume Bias
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Prioritizes incidents by raw count of tweets/calls. High connectivity corridors win.
          </p>

          <div className="space-y-1.5 divide-y divide-slate-800/60">
            {loudest.incidents.slice(0, 7).map((inc) => (
              <div key={inc.id} className="pt-1.5 flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-amber-400 shrink-0">#{inc.rank}</span>
                  <p className="font-semibold text-slate-200 truncate text-[11px]">{inc.title}</p>
                </div>
                <span className="font-mono text-slate-300 shrink-0">{inc.reportCount} reports</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: First-Come-First-Served (Naive FIFO) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-slate-300 text-xs">First-Come-First-Served</span>
            <span className="rounded bg-slate-800 text-slate-400 px-1.5 py-0.5 font-mono text-[10px]">
              FIFO
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Dispatches purely by arrival timestamp. Early routine waterlogging blocks late-arriving life risks.
          </p>

          <div className="space-y-1.5 divide-y divide-slate-800/60">
            {fcfs.incidents.slice(0, 7).map((inc) => (
              <div key={inc.id} className="pt-1.5 flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-slate-400 shrink-0">#{inc.rank}</span>
                  <p className="font-semibold text-slate-300 truncate text-[11px]">{inc.title}</p>
                </div>
                <span className="font-mono text-slate-400 shrink-0 text-[10px]">
                  {new Date(inc.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
