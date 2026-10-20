"use client";

import React from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import {
  Sparkles,
  CheckCircle,
  XCircle,
  BarChart3,
  GitMerge,
  ShieldAlert,
  Percent,
  Scale,
  Award,
  Info,
  Clock,
  MapPinned,
  Recycle,
} from "lucide-react";

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

export default function EvaluationPage() {
  const { evaluationMetrics, incidents, scenario } = useCrisisStore();
  const { extraction, merging, ranking, equity } = evaluationMetrics;

  const cases = [
    {
      key: "d" as const,
      passed: merging.plantedCasesResults.caseD_mergedPuddles,
      title: "Case (d): Ejipura Underpass Duplicate Cluster",
      description:
        "Near-identical calls, SMS and social posts about the Ejipura junction underpass filling within minutes are consolidated while genuinely independent locations remain separate.",
    },
    {
      key: "e" as const,
      passed: merging.plantedCasesResults.caseE_keptLethalWireSeparate,
      title: "Case (e): Lethal Hazard Kept Separate",
      description:
        "A sparking transformer at the Kempapura substation is prevented from merging into routine Hebbal lake-bund waterlogging incidents, preserving the safety guardrail.",
    },
    {
      key: "f" as const,
      passed: merging.plantedCasesResults.caseF_detectedRecycledPosts,
      title: "Case (f): Viral Dam-Release Rumour",
      description:
        "Copy-pasted KRS dam-release panic text is fingerprinted so repeated forwards do not inflate the distinct reporter count or reliability score.",
    },
  ];

  const rankings = [
    {
      name: "CrisisSignal Priority Engine (Ours)",
      highlight: true,
      metrics: ranking.crisissignal,
    },
    {
      name: "Loudest-Area-First (Raw Volume)",
      highlight: false,
      metrics: ranking.loudestFirst,
    },
    {
      name: "First-Come-First-Served (FIFO)",
      highlight: false,
      metrics: ranking.fcfs,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-transparent p-6 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Scientific Evaluation &amp; Ground Truth Benchmark
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Metrics are recomputed in real time from the hidden news backbone and the
              current replay state. No hardcoded statistics.
            </p>
          </div>
        </div>

        <div className="rounded bg-white border border-slate-200 px-3 py-1 font-mono text-xs text-slate-500">
          {extraction.validatedCount} / {extraction.totalReports} reports ·{" "}
          {merging.trueIncidentCount} true backbone groups
        </div>
      </div>

      {/* Honest Disclaimer Banner */}
      <div className="rounded-lg border border-sky-200/60 bg-sky-50/30 p-3 text-xs text-sky-700 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <b>Historical replay, not a live validation:</b> {scenario.name} replays
          22 August – 7 September 2022, the real window of the Bengaluru floods, using
          fully synthetic event data: KSNDMC-style telemetry, BBMP/KSNDMC-style bulletins
          and generated citizen channels. The benchmark proves
          the algorithmic logic and equity behaviour against a known backbone; it does
          not claim operational accuracy in an ongoing disaster.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-white p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Percent className="h-4 w-4 text-emerald-500" /> Extraction Accuracy
          </span>
          <p className="text-3xl font-black text-emerald-500 font-mono">
            {extraction.accuracyPercent}%
          </p>
          <p className="text-[11px] text-slate-500">
            Across location, risk, depth, hazards and counts
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <GitMerge className="h-4 w-4 text-blue-500" /> Merging F1 Score
          </span>
          <p className="text-3xl font-black text-blue-500 font-mono">
            {merging.f1Score.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500">
            Precision: {merging.precision.toFixed(2)} · Recall: {merging.recall.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" /> Top-5 Priority Overlap
          </span>
          <p className="text-3xl font-black text-primary font-mono">
            {ranking.crisissignal.top5OverlapPercent}%
          </p>
          <p className="text-[11px] text-slate-500">
            Vs FCFS ({ranking.fcfs.top5OverlapPercent}%) and Loudest-Area (
            {ranking.loudestFirst.top5OverlapPercent}%)
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-purple-500" /> Silent Zone Detection
          </span>
          <p className="text-3xl font-black text-purple-500 font-mono">
            {equity.detectionRatePercent}%
          </p>
          <p className="text-[11px] text-slate-500">
            {equity.silentZonesDetectedCount} of {equity.silentZonesTotal} ground-truth
            quiet zones caught
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            {equity.flaggedZonesCount} zones flagged · {equity.flaggedZonesMatchingGroundTruth}{" "}
            match GT ({equity.flaggedZonePrecisionPercent}% of flags)
          </p>
        </div>
      </div>

      {/* Equity summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-purple-500 shrink-0" />
          <div>
            <p className="font-mono text-lg font-bold text-slate-900">
              {equity.silenceLeadTimeHours !== 0
                ? `${equity.silenceLeadTimeHours > 0 ? "+" : ""}${equity.silenceLeadTimeHours.toFixed(1)} h`
                : "0.0 h"}
            </p>
            <p className="text-[11px] text-slate-500">
              Mean lead vs first confirming report (+ = early, − = late)
              {equity.silentZonesTotal > 0
                ? ` · ${equity.earlyWarningZones}/${equity.silentZonesTotal} early`
                : ""}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
          <MapPinned className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-mono text-lg font-bold text-slate-900">
              {equity.districtOverlapPercent}%
            </p>
            <p className="text-[11px] text-slate-500">
              Top-priority district overlap with official worst-hit list
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
          <Recycle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-mono text-lg font-bold text-slate-900">
              {merging.recycledDuplicatesDetected}
            </p>
            <p className="text-[11px] text-slate-500">
              Recycled copy-paste posts detected
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Extraction Breakdown */}
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Percent className="h-4 w-4 text-emerald-500" /> Field Extraction Breakdown
          </h3>

          <div className="space-y-3">
            {Object.entries(extraction.fieldAccuracy).map(([field, score]) => (
              <div key={field} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="capitalize text-slate-600">
                    {field.replace(/_/g, " ")}
                  </span>
                  <span className="text-emerald-500 font-bold">{score}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${score}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-600">Design Guardrail Enforced:</p>
            <p>
              Fields not present in the raw report are strictly labelled
              &quot;Unknown&quot;. Every extracted field keeps a character-span evidence
              pointer, and location falls back to a district centroid rather than
              inventing a village.
            </p>
          </div>
        </div>

        {/* Module 2: Duplicate Merging case verification */}
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-blue-500" /> Merge &amp; Safety Case
            Verification
          </h3>

          <div className="space-y-3 text-xs">
            {cases.map((testCase) => (
              <div
                key={testCase.key}
                className={`rounded border p-3 flex items-start gap-2.5 ${
                  testCase.passed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                {testCase.passed ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-slate-900">{testCase.title}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {testCase.description}
                  </p>
                  <p
                    className={`mt-1 font-mono text-[10px] font-bold ${
                      testCase.passed ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {testCase.passed ? "PASSED IN CURRENT REPLAY" : "NOT YET SATISFIED"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module 3: Ranking Quality vs Baselines */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" /> Ranking Quality Comparison
          Against Baselines
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                <th className="py-2.5 px-3">Ranking Algorithm</th>
                <th className="py-2.5 px-3">Top-5 Priority Overlap</th>
                <th className="py-2.5 px-3">NDCG @ 10</th>
                <th className="py-2.5 px-3">Kendall Tau</th>
                <th className="py-2.5 px-3">Kogilu Equity Incident Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 font-mono text-xs">
              {rankings.map((row) => (
                <tr
                  key={row.name}
                  className={
                    row.highlight
                      ? "bg-primary/10 text-slate-900 font-bold"
                      : "text-slate-600"
                  }
                >
                  <td
                    className={`py-3 px-3 ${
                      row.highlight ? "text-primary flex items-center gap-1.5" : ""
                    }`}
                  >
                    {row.highlight && <Sparkles className="h-3.5 w-3.5" />}
                    {row.name}
                  </td>
                  <td className="py-3 px-3">{row.metrics.top5OverlapPercent}%</td>
                  <td className="py-3 px-3">{row.metrics.ndcgAt10.toFixed(1)}</td>
                  <td className="py-3 px-3">{signed(row.metrics.kendallTau)}</td>
                  <td className="py-3 px-3">
                    {row.metrics.equityRank
                      ? `Rank #${row.metrics.equityRank}`
                      : "Not in top set"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
          <b>Takeaway for judges:</b> {ranking.equityStory}
        </p>
      </div>

      {/* Module 4: Equity Check (Silence Layer) */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-purple-500" /> Equity Check: Silence Layer
          Detection of Underserved Zones
        </h3>

        {equity.silentZonesDetails.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500 text-xs">
            No zone has crossed the silence threshold at the current replay time. Play
            forward in the replay to inspect an active alert.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {equity.silentZonesDetails.map((sz) => (
              <div
                key={sz.wardId}
                className="rounded-lg border border-purple-200 bg-slate-50 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{sz.wardName}</span>
                  <span className="font-mono text-purple-600 font-bold">
                    Score: {sz.silenceScore.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      sz.flagged
                        ? "bg-purple-50 text-purple-600 border border-purple-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {sz.flagged ? "✓ DETECTED AS SILENT NEED" : "Pending Detection"}
                  </span>
                  {typeof sz.leadTimeHours === "number" && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                        sz.leadTimeHours >= 0
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}
                    >
                      {sz.leadTimeHours >= 0
                        ? `${sz.leadTimeHours.toFixed(1)} h lead`
                        : `${Math.abs(sz.leadTimeHours).toFixed(1)} h late`}
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  Onset: {sz.onsetTime ? new Date(sz.onsetTime).toLocaleString() : "—"}
                </div>

                <ul className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200">
                  {sz.reasons.slice(0, 2).map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backbone reference */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" /> Active Replay Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 text-[10px]">Incidents formed</p>
            <p className="text-slate-900 text-lg font-bold">{incidents.length}</p>
          </div>
          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 text-[10px]">Reports available</p>
            <p className="text-slate-900 text-lg font-bold">{extraction.totalReports}</p>
          </div>
          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 text-[10px]">Silent zones flagged</p>
            <p className="text-slate-900 text-lg font-bold">
              {equity.silentZonesDetectedCount}
            </p>
          </div>
          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 text-[10px]">True groups</p>
            <p className="text-slate-900 text-lg font-bold">{merging.trueIncidentCount}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Ground truth is hidden from the engine. It is applied only here, after the
          replay has already formed and ranked incidents.
        </p>
      </div>
      </div>
    </div>
  );
}
