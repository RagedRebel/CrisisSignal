"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCrisisStore } from "@/store/useCrisisStore";
import { formatReplayTime } from "@/lib/utils";
import {
  Activity,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  PlusCircle,
  Eye,
  SlidersHorizontal,
  Radio,
  Clock,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/audit", label: "Audit Log" },
  { href: "/settings", label: "Settings" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();
  const {
    isPlaying,
    togglePlay,
    stepForward,
    resetSimulation,
    playbackSpeed,
    setPlaybackSpeed,
    currentSimulatedTime,
    injectRawReport,
    showGroundTruth,
    setShowGroundTruth,
    showBaselineComparison,
    setShowBaselineComparison,
    eventTicker,
  } = useCrisisStore();

  const [injectOpen, setInjectOpen] = useState(false);
  const [injectText, setInjectText] = useState("");
  const [injectChannel, setInjectChannel] = useState("sms");

  const formattedTime = formatReplayTime(currentSimulatedTime);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleInjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectText.trim()) return;
    void injectRawReport(injectText, injectChannel);
    setInjectText("");
    setInjectOpen(false);
  };

  return (
    <header className="z-40 shrink-0 border-b border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Primary row: brand, navigation, playback and actions */}
      <div className="flex h-[52px] items-center gap-2 px-4 text-xs">
        <Link href="/" className="mr-1 flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-200 bg-sky-500/10">
            <Activity className="h-4 w-4 text-sky-500" />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[13px] font-semibold tracking-tight text-slate-900">
              CrisisSignal
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500">Priority Engine v2.4</span>
          </span>
        </Link>

        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500 2xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Bengaluru 2022 · Historical replay
        </span>

        <nav className="ml-1 flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-600 md:flex">
            <Clock className="h-3 w-3 text-sky-500" />
            <span>{formattedTime}</span>
            <span className="text-[9px] text-slate-500">IST</span>
          </div>

          <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">
            <button
              onClick={togglePlay}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                isPlaying
                  ? "bg-amber-600 text-white hover:bg-amber-500"
                  : "bg-sky-600 text-white hover:bg-sky-500"
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
            <button
              onClick={stepForward}
              title="Advance 10 minutes"
              className="rounded px-1.5 py-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={resetSimulation}
              title="Reset replay"
              className="rounded px-1.5 py-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="hidden items-center rounded-md border border-slate-200 bg-white p-0.5 lg:flex">
            {[1, 5, 20, 60].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`rounded px-1.5 py-1 font-mono text-[10px] transition-colors ${
                  playbackSpeed === spd
                    ? "bg-slate-200 font-semibold text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowGroundTruth(!showGroundTruth)}
            title="Toggle ground truth benchmark"
            className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
              showGroundTruth
                ? "border-purple-200 bg-purple-50 text-purple-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span className="hidden xl:inline">Ground truth</span>
          </button>

          <button
            onClick={() => setShowBaselineComparison(!showBaselineComparison)}
            title="Toggle baseline comparison"
            className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
              showBaselineComparison
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span className="hidden xl:inline">Baselines</span>
          </button>

          <button
            onClick={() => setInjectOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-emerald-500"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inject report</span>
          </button>
        </div>
      </div>

      {/* Tertiary row: live event ticker */}
      <div className="flex h-7 items-center gap-2 border-t border-slate-200/70 bg-slate-50 px-4 text-[10px]">
        <span className="flex shrink-0 items-center gap-1 font-mono font-medium text-slate-500">
          <Radio className="h-3 w-3 text-red-500/80" />
          REPLAY TICKER
        </span>
        <span className="min-w-0 truncate text-slate-500">
          {eventTicker.length > 0 ? (
            <>
              <span className="mr-1 font-mono text-slate-500">
                [{eventTicker[0].time.slice(11, 16)}]
              </span>
              {eventTicker[0].text}
            </>
          ) : (
            <span className="italic text-slate-600">
              System ready — press play to stream the replay.
            </span>
          )}
        </span>
      </div>

      {/* Inject report modal */}
      {injectOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 text-xs shadow-2xl">
            <div className="mb-1 flex items-start justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <PlusCircle className="h-4 w-4 text-emerald-500" />
                Inject a flood report
              </h3>
              <button
                onClick={() => setInjectOpen(false)}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
              Paste a messy report in English, Hindi, Kannada or Hinglish. It will be
              extracted, located, de-duplicated and ranked live.
            </p>

            <form onSubmit={handleInjectSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Channel
                </label>
                <select
                  value={injectChannel}
                  onChange={(e) => setInjectChannel(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  <option value="sms">SMS</option>
                  <option value="social">Social media (X/Twitter)</option>
                  <option value="call_transcript">Emergency call transcript</option>
                  <option value="volunteer_app">Field volunteer app</option>
                  <option value="sensor">Telemetry sensor</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Message content
                </label>
                <textarea
                  value={injectText}
                  onChange={(e) => setInjectText(e.target.value)}
                  placeholder="e.g. Whitefield main road pe paani waist tak hai, 4 log phase hain"
                  rows={4}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="text-slate-500">Try:</span>
                <button
                  type="button"
                  onClick={() =>
                    setInjectText(
                      "Ejipura ke paas paani chest level hai, 3 bachhe chhat par baithe hain, boat chahiye"
                    )
                  }
                  className="text-sky-500 hover:underline"
                >
                  Hinglish trapped kids
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInjectText(
                      "Kogilu Cross road bridge washed away completely! 50 families cut off, water chest level"
                    )
                  }
                  className="text-sky-500 hover:underline"
                >
                  Remote bridge cutoff
                </button>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setInjectOpen(false)}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Inject live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
