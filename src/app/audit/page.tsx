"use client";

import React, { useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import {
  FileText,
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
    <div className="h-full overflow-y-auto bg-transparent p-6 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Human-in-the-Loop Audit Log
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable chronological record of coordinator overrides, simulated dispatches, location corrections, and merge confirmations.
            </p>
          </div>
        </div>

        <div className="rounded bg-white border border-slate-200 px-3 py-1 font-mono text-xs text-slate-500">
          Total Entries: {auditLogs.length}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search actor, reason, or incident..."
            className="w-full rounded bg-slate-50 border border-slate-200 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs text-slate-900"
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
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="font-semibold text-slate-500">No Coordinator Actions Logged Yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              When a coordinator overrides an urgency score, confirms a merge, assigns a welfare check, or dispatches units, every action with its mandatory reason will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">State Change (Before → After)</th>
                  <th className="py-2.5 px-3">Coordinator Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-slate-100 border border-slate-300 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
                        {log.action_type.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs truncate">
                      {log.target_title}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs font-mono text-[10px]">
                      <span className="text-rose-500">
                        {JSON.stringify(log.before_state).substring(0, 40)}
                      </span>{" "}
                      →{" "}
                      <span className="text-emerald-500">
                        {JSON.stringify(log.after_state).substring(0, 40)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 bg-slate-50/40 rounded italic">
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
    </div>
  );
}
