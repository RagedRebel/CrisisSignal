"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  ShieldCheck,
  Search,
  Filter,
  Sliders,
  Send,
  XCircle,
  GitMerge,
  MapPin,
  Clock,
} from "lucide-react";

export default function AuditLogPage() {
  const { auditLogs } = useCrisisStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = auditLogs.filter((entry) => {
    if (searchTerm) {
      const matchActor = entry.actor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTarget = entry.target_title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchReason = entry.reason.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchActor && !matchTarget && !matchReason) return false;
    }
    if (actionFilter !== "all" && entry.action_type !== actionFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-foreground p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Human-in-the-Loop Audit Log
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable chronological record of coordinator overrides, simulated dispatches, location corrections, and merge confirmations.
            </p>
          </div>
        </div>

        <div className="rounded bg-slate-900 border border-slate-800 px-3 py-1 font-mono text-xs text-slate-400">
          Total Entries: {auditLogs.length}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-border text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search actor, reason, or incident..."
            className="w-full rounded bg-slate-950 border border-slate-800 py-1.5 pl-8 pr-2 text-xs text-white placeholder-slate-500 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-white"
          >
            <option value="all">All Actions</option>
            <option value="priority_override">Priority Override</option>
            <option value="simulated_dispatch">Simulated Dispatch</option>
            <option value="location_override">Location Anchor Override</option>
            <option value="merge_confirmed">Merge Confirmed</option>
            <option value="merge_split">Merge Split</option>
            <option value="mark_false_alarm">Mark False Alarm</option>
            <option value="welfare_check_assigned">Welfare Check Assigned</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="rounded-xl border border-border bg-slate-900/40 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <FileText className="h-8 w-8 text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-400">No Coordinator Actions Logged Yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              When a coordinator overrides an urgency score, confirms a merge, assigns a welfare check, or dispatches units, every action with its mandatory reason will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">State Change (Before → After)</th>
                  <th className="py-2.5 px-3">Coordinator Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-300 whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
                        {log.action_type.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white max-w-xs truncate">
                      {log.target_title}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs font-mono text-[10px]">
                      <span className="text-rose-400">
                        {JSON.stringify(log.before_state).substring(0, 40)}
                      </span>{" "}
                      →{" "}
                      <span className="text-emerald-400">
                        {JSON.stringify(log.after_state).substring(0, 40)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200 bg-slate-950/40 rounded italic">
                      &quot;{log.reason}&quot;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
