"use client";

import React from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { Sliders, RotateCcw, Save, ShieldCheck, WifiOff } from "lucide-react";
import { DEFAULT_WEIGHTS } from "@/engine/scoring/urgency";

export default function SettingsPage() {
  const { settings, updateSettings } = useCrisisStore();

  const handleWeightChange = (key: keyof typeof DEFAULT_WEIGHTS, val: number) => {
    updateSettings({
      weights: {
        ...settings.weights,
        [key]: val,
      },
    });
  };

  const handleThresholdChange = (key: keyof typeof settings.thresholds, val: number) => {
    updateSettings({
      thresholds: {
        ...settings.thresholds,
        [key]: val,
      },
    });
  };

  const resetWeights = () => {
    updateSettings({
      weights: { ...DEFAULT_WEIGHTS },
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-transparent p-6 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-6 w-6 text-primary" />
              Engine Configuration & Weights
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune urgency factor weights, deduplication thresholds, and connectivity modes.
            </p>
          </div>
        </div>

        <button
          onClick={resetWeights}
          className="flex items-center gap-1.5 rounded bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs text-slate-600 font-semibold"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
        </button>
      </div>

      {/* Offline Mode Toggle Card */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <WifiOff className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Offline Mode Guardrail</h3>
              <p className="text-xs text-slate-500">
                Runs precomputed extractions and deterministic regex/fuzzy gazetteer without requiring external APIs or internet connectivity.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.offline_mode}
              onChange={(e) => updateSettings({ offline_mode: e.target.checked })}
              className="sr-only peer"
            />
            <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-200 after:bg-white after:content-[''] after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
          </label>
        </div>
      </div>

      {/* Urgency Factor Weights (0 - 1.0) */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-5">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Urgency Scoring Factor Weights</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjusting weights will immediately recalculate urgency scores across all active incidents.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 font-semibold">Life Risk Weight</span>
              <span className="text-primary font-bold">{settings.weights.life_risk.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={settings.weights.life_risk}
              onChange={(e) => handleWeightChange("life_risk", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Trapped, injured, unconscious, and medically dependent situations scaled by people count.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 font-semibold">Vulnerable Groups Weight</span>
              <span className="text-primary font-bold">
                {settings.weights.vulnerable_groups.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={settings.weights.vulnerable_groups}
              onChange={(e) => handleWeightChange("vulnerable_groups", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Elderly, children, pregnant, and disabled individuals present, plus ward demographic index.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 font-semibold">Hazard Severity Weight</span>
              <span className="text-primary font-bold">
                {settings.weights.hazard_severity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={settings.weights.hazard_severity}
              onChange={(e) => handleWeightChange("hazard_severity", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Depth band (ankle to above-head), rising trend, electrical, current, and structure collapse.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 font-semibold">Time Waiting Weight</span>
              <span className="text-primary font-bold">
                {settings.weights.time_waiting.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={settings.weights.time_waiting}
              onChange={(e) => handleWeightChange("time_waiting", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Saturating exponential curve based on elapsed minutes with no recorded dispatch action.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 font-semibold">Access Difficulty Weight</span>
              <span className="text-primary font-bold">
                {settings.weights.access_difficulty.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.05"
              value={settings.weights.access_difficulty}
              onChange={(e) => handleWeightChange("access_difficulty", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Road cut off, boat requirement, and physical remoteness of terrain.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 font-semibold">Report Reliability Weight</span>
              <span className="text-primary font-bold">
                {settings.weights.report_reliability.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.05"
              value={settings.weights.report_reliability}
              onChange={(e) => handleWeightChange("report_reliability", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Multi-source confirmation and first-hand credibility (capped so unverified reports aren&apos;t buried).
            </p>
          </div>
        </div>
      </div>

      {/* Deduplication & Silence Thresholds */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Detection & Deduplication Thresholds</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600">Silence Flag Threshold</span>
              <span className="text-purple-500 font-bold">
                {settings.thresholds.silence_flag_threshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.85"
              step="0.05"
              value={settings.thresholds.silence_flag_threshold}
              onChange={(e) => handleThresholdChange("silence_flag_threshold", parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Wards with silence score above this value are highlighted for welfare checks.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600">Spatial Merge Distance</span>
              <span className="text-blue-500 font-bold">
                {settings.thresholds.merge_distance_meters} meters
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="50"
              value={settings.thresholds.merge_distance_meters}
              onChange={(e) => handleThresholdChange("merge_distance_meters", parseInt(e.target.value, 10))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Base distance threshold for duplicate candidate clustering.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
