"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  Search,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import { ProcessedReport } from "@/engine/types";
import { useCrisisStore } from "@/store/useCrisisStore";

type ChannelFilter = "all" | ProcessedReport["raw"]["channel"];

const CHANNEL_LABELS: Record<ProcessedReport["raw"]["channel"], string> = {
  sms: "SMS",
  social: "Social",
  volunteer_app: "Volunteer app",
  call_transcript: "Call transcript",
  sensor: "Sensor",
  official: "Official",
};

const SOURCE_COLORS: Record<ProcessedReport["raw"]["channel"], string> = {
  sms: "border-violet-200 bg-violet-50 text-violet-700",
  social: "border-pink-200 bg-pink-50 text-pink-700",
  volunteer_app: "border-emerald-200 bg-emerald-50 text-emerald-700",
  call_transcript: "border-amber-200 bg-amber-50 text-amber-700",
  sensor: "border-cyan-200 bg-cyan-50 text-cyan-700",
  official: "border-blue-200 bg-blue-50 text-blue-700",
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function locationLabel(report: ProcessedReport) {
  return (
    report.location.landmark_name ||
    report.location.district ||
    report.extracted.location_raw ||
    "Location unresolved"
  );
}

export default function ReportsPage() {
  const { processedReports, currentSimulatedTime } = useCrisisStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProcessedReport["extraction_status"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...processedReports]
      .filter((report) => {
        if (channelFilter !== "all" && report.raw.channel !== channelFilter) return false;
        if (statusFilter !== "all" && report.extraction_status !== statusFilter) return false;
        if (!query) return true;
        return [
          report.raw.raw_text,
          report.raw.sender_id,
          report.raw.id,
          locationLabel(report),
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => new Date(b.raw.timestamp).getTime() - new Date(a.raw.timestamp).getTime());
  }, [channelFilter, processedReports, searchTerm, statusFilter]);

  const channelCounts = useMemo(
    () =>
      processedReports.reduce<Record<string, number>>((counts, report) => {
        counts[report.raw.channel] = (counts[report.raw.channel] || 0) + 1;
        return counts;
      }, {}),
    [processedReports]
  );

  const selectedReport = filteredReports.find((report) => report.id === selectedId) || null;

  return (
    <div className="h-full overflow-y-auto bg-transparent p-6 text-foreground">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-600" />
              <h1 className="text-xl font-bold text-slate-900">Report Inbox</h1>
            </div>
            <p className="text-xs text-slate-500">
              All reports ingested from citizen, social, volunteer, sensor, and official sources.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-600">
              {processedReports.length} stored
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-500">
              Replay: {formatTimestamp(currentSimulatedTime)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {Object.entries(CHANNEL_LABELS).map(([channel, label]) => (
            <button
              key={channel}
              onClick={() => setChannelFilter(channel as ChannelFilter)}
              className={`rounded-lg border bg-white p-3 text-left transition-colors ${
                channelFilter === channel ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900">{channelCounts[channel] || 0}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search report text, sender, ID, or location..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <select
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value as ChannelFilter)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">All sources</option>
              {Object.entries(CHANNEL_LABELS).map(([channel, label]) => (
                <option key={channel} value={channel}>{label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">All processing states</option>
              <option value="validated">Validated</option>
              <option value="needs_human_reading">Needs human reading</option>
              <option value="malformed">Malformed</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {filteredReports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Waves className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <h2 className="text-sm font-semibold text-slate-700">
                {processedReports.length === 0 ? "No reports ingested yet" : "No reports match these filters"}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                {processedReports.length === 0
                  ? "Press Play or advance the replay from the navigation bar to stream reports into the inbox."
                  : "Try clearing the search or choosing a different source and processing state."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Received</th>
                    <th className="px-4 py-2.5">Source</th>
                    <th className="px-4 py-2.5">Report</th>
                    <th className="px-4 py-2.5">Location</th>
                    <th className="px-4 py-2.5">Processing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedId(selectedId === report.id ? null : report.id)}
                      className={`cursor-pointer align-top transition-colors hover:bg-sky-50/50 ${selectedId === report.id ? "bg-sky-50" : ""}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                        {formatTimestamp(report.raw.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded border px-2 py-1 text-[10px] font-semibold ${SOURCE_COLORS[report.raw.channel]}`}>
                          {CHANNEL_LABELS[report.raw.channel]}
                        </span>
                        <p className="mt-1 max-w-[130px] truncate text-[10px] text-slate-500">{report.raw.sender_id}</p>
                      </td>
                      <td className="max-w-[430px] px-4 py-3">
                        <p className="line-clamp-2 leading-5 text-slate-700">{report.raw.raw_text}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">{report.raw.id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="flex max-w-[180px] items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                          <span className="line-clamp-2">{locationLabel(report)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${
                          report.extraction_status === "validated"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}>
                          {report.extraction_status === "validated" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {report.extraction_status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedReport && (
          <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-sky-700">Selected report · {selectedReport.id}</p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-800">{selectedReport.raw.raw_text}</p>
              </div>
              <span className="shrink-0 rounded border border-sky-200 bg-white px-2 py-1 text-[10px] font-semibold text-sky-700">
                {selectedReport.provenance || selectedReport.raw.provenance || "unknown"} provenance
              </span>
            </div>
            <div className="mt-3 grid gap-2 border-t border-sky-200 pt-3 text-[11px] text-slate-600 sm:grid-cols-3">
              <span><strong>Source type:</strong> {selectedReport.raw.source_type.replaceAll("_", " ")}</span>
              <span><strong>Location method:</strong> {selectedReport.location.resolution_method.replaceAll("_", " ")}</span>
              <span><strong>Reported:</strong> {formatTimestamp(selectedReport.extracted.reported_at)}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
