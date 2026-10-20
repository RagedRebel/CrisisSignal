"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  PlusCircle,
  Eye,
  SlidersHorizontal,
  Flame,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatReplayTime } from "@/lib/utils";

export function SimulationBar() {
  const {
    isPlaying,
    togglePlay,
    stepForward,
    resetSimulation,
    playbackSpeed,
    setPlaybackSpeed,
    currentSimulatedTime,
    scenario,
    jumpToKeyMoment,
    injectRawReport,
    showGroundTruth,
    setShowGroundTruth,
    showBaselineComparison,
    setShowBaselineComparison,
    eventTicker,
    settings,
  } = useCrisisStore();

  const [injectModalOpen, setInjectModalOpen] = useState(false);
  const [injectText, setInjectText] = useState("");
  const [injectChannel, setInjectChannel] = useState("sms");

  const formattedTime = formatReplayTime(currentSimulatedTime);

  const handleInjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectText.trim()) return;
    injectRawReport(injectText, injectChannel);
    setInjectText("");
    setInjectModalOpen(false);
  };

  return (
    <header className="border-b border-border bg-[#0b1120] px-4 py-2 text-xs">
      {/* Top Bar Navigation & Main Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Mode Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emergency opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emergency"></span>
            </span>
            <span className="font-bold text-sm tracking-wide text-foreground">
              CrisisSignal <span className="text-primary font-mono text-xs">v2.4 PRO</span>
            </span>
          </div>

          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-700">
            Bengaluru 2022 Control Room (REPLAY)
          </span>

          {settings.offline_mode && (
            <span className="rounded bg-emerald-950/80 border border-emerald-700 px-2 py-0.5 font-mono text-[10px] text-emerald-300 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Engine: 100% Local · No API Keys
            </span>
          )}
        </div>

        {/* Timeline Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
          {/* Scenario Clock */}
          <div className="flex items-center gap-1.5 px-2 font-mono text-amber-400 font-semibold text-xs border-r border-slate-800">
            <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>T: {formattedTime} IST</span>
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-semibold text-white transition-colors ${
              isPlaying ? "bg-amber-600 hover:bg-amber-500" : "bg-primary hover:bg-sky-400 text-slate-950"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" /> Play
              </>
            )}
          </button>

          {/* Step Button */}
          <button
            onClick={stepForward}
            title="Advance 10 minutes"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700 transition"
          >
            <SkipForward className="h-3 w-3" /> +10m
          </button>

          {/* Reset Button */}
          <button
            onClick={resetSimulation}
            title="Reset Simulation"
            className="rounded bg-slate-800 p-1 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <RotateCcw className="h-3 w-3" />
          </button>

          {/* Speed Multiplier */}
          <div className="flex items-center border-l border-slate-800 pl-2 gap-1 text-[11px]">
            <span className="text-slate-400">Speed:</span>
            {[1, 5, 20, 60].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`rounded px-1.5 py-0.5 font-mono ${
                  playbackSpeed === spd
                    ? "bg-primary text-slate-950 font-bold"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Feature Toggles & Actions */}
        <div className="flex items-center gap-2">
          {/* Inject Report Button */}
          <button
            onClick={() => setInjectModalOpen(true)}
            className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-white font-medium shadow-sm transition"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Inject Report
          </button>

          {/* Ground Truth Toggle */}
          <button
            onClick={() => setShowGroundTruth(!showGroundTruth)}
            className={`flex items-center gap-1 rounded border px-2 py-1 transition ${
              showGroundTruth
                ? "bg-purple-950/80 border-purple-500 text-purple-200 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="h-3 w-3" /> Ground Truth
          </button>

          {/* Baseline Comparison Toggle */}
          <button
            onClick={() => setShowBaselineComparison(!showBaselineComparison)}
            className={`flex items-center gap-1 rounded border px-2 py-1 transition ${
              showBaselineComparison
                ? "bg-blue-950/80 border-blue-500 text-blue-200 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" /> Baselines
          </button>

          {/* Navigation Links */}
          <div className="flex items-center border-l border-slate-800 pl-2 gap-1">
            <Link
              href="/"
              className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Console
            </Link>
            <Link
              href="/evaluation"
              className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3 text-primary" /> Evaluation
            </Link>
            <Link
              href="/audit"
              className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Audit Log
            </Link>
            <Link
              href="/settings"
              className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Settings
            </Link>
            <Link
              href="/about"
              className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              About
            </Link>
          </div>
        </div>
      </div>

      {/* Demo Quick-Jump Bar for Planted Cases a through f */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-1.5">
        <span className="font-semibold text-slate-400 flex items-center gap-1 text-[11px] mr-1">
          <Zap className="h-3 w-3 text-amber-400" /> Jump to Case:
        </span>
        {scenario.keyMoments.map((km) => (
          <button
            key={km.id}
            onClick={() => jumpToKeyMoment(km.id)}
            title={km.description}
            className="rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-300 hover:text-primary transition flex items-center gap-1"
          >
            <span className="font-bold text-amber-400 font-mono">({km.caseLetter})</span>
            <span className="truncate max-w-[140px]">{km.title.split(":")[1]?.trim() || km.title}</span>
          </button>
        ))}
      </div>

      {/* Live Event Ticker */}
      <div className="mt-1.5 flex items-center gap-2 overflow-hidden bg-slate-950/90 rounded px-2 py-0.5 border border-slate-900 text-[11px]">
        <span className="flex items-center gap-1 text-primary font-mono font-bold shrink-0">
          <Radio className="h-3 w-3 animate-pulse text-emergency" /> LIVE TICKER:
        </span>
        <div className="truncate text-slate-400">
          {eventTicker.length > 0 ? (
            <span>
              <span className="font-mono text-slate-300">[{eventTicker[0].time}]</span>{" "}
              {eventTicker[0].text}
            </span>
          ) : (
            <span className="italic text-slate-500">
              System ready. Click Play or Jump to Key Moment to stream simulated disaster reports.
            </span>
          )}
        </div>
      </div>

      {/* Inject Report Modal */}
      {injectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-[#0f172a] p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <PlusCircle className="h-5 w-5 text-emerald-400" /> Inject Custom Flood Report
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Type or paste any messy report in English, Hindi, Kannada, or Hinglish. Watch it get extracted, located, deduplicated, and ranked live.
            </p>

            <form onSubmit={handleInjectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Channel</label>
                <select
                  value={injectChannel}
                  onChange={(e) => setInjectChannel(e.target.value)}
                  className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  <option value="sms">SMS</option>
                  <option value="social">Social Media (Twitter/X)</option>
                  <option value="call_transcript">Emergency Call Transcript</option>
                  <option value="volunteer_app">Field Volunteer App</option>
                  <option value="sensor">Telemetry Sensor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Message Content (Try Hinglish, e.g. &quot;Whitefield main road pe paani waist tak hai, 4 log phase hain&quot;)
                </label>
                <textarea
                  value={injectText}
                  onChange={(e) => setInjectText(e.target.value)}
                  placeholder="Enter raw disaster message..."
                  rows={4}
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2.5 text-xs text-white placeholder-slate-500 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              {/* Sample Quick Templates */}
              <div className="flex flex-wrap gap-1 text-[11px]">
                <span className="text-slate-400">Quick suggestions:</span>
                <button
                  type="button"
                  onClick={() =>
                    setInjectText(
                      "Ejipura ke paas paani chest level hai, 3 bachhe chhat par baithe hain, boat chahiye"
                    )
                  }
                  className="text-primary hover:underline"
                >
                  [Hinglish trapped kids]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInjectText(
                      "Kogilu Cross road bridge washed away completely! 50 families cut off, water chest level"
                    )
                  }
                  className="text-primary hover:underline"
                >
                  [Remote bridge cutoff]
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInjectModalOpen(false)}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow"
                >
                  Inject Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
