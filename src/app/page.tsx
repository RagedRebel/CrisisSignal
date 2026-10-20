"use client";

import React, { useEffect, useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { MapView } from "@/components/map/MapView";
import { QueuePanel } from "@/components/console/QueuePanel";
import { DetailPanel } from "@/components/console/DetailPanel";
import { BaselineComparison } from "@/components/simulation/BaselineComparison";
import { GroundTruthOverlay } from "@/components/simulation/GroundTruthOverlay";
import { ChevronLeft } from "lucide-react";

export default function DashboardPage() {
  const { selectedIncidentId } = useCrisisStore();
  const [queueOpen, setQueueOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);

  // Open the slide-over only when the coordinator explicitly picks a case in
  // the queue or on the map. Automatic re-ranking never steals the map view.
  useEffect(() => {
    const openDetails = () => setDetailOpen(true);
    window.addEventListener("crisissignal:incident-selected", openDetails);
    return () =>
      window.removeEventListener("crisissignal:incident-selected", openDetails);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      {/* Full-bleed tactical map */}
      <div className="absolute inset-0 isolate">
        <MapView />
      </div>

      {/* Floating report queue */}
      <QueuePanel collapsed={!queueOpen} onToggle={() => setQueueOpen((open) => !open)} />

      {/* Slide-over decision panel */}
      {selectedIncidentId && detailOpen && (
        <aside className="absolute inset-y-0 right-0 z-30 w-[390px] max-w-[92vw] border-l border-slate-200 bg-white shadow-2xl">
          <DetailPanel onClose={() => setDetailOpen(false)} />
        </aside>
      )}

      {/* Reopen handle when the detail panel is closed */}
      {selectedIncidentId && !detailOpen && (
        <button
          onClick={() => setDetailOpen(true)}
          title="Open incident details"
          className="absolute right-0 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 rounded-l-md border border-r-0 border-slate-300 bg-white/95 px-1.5 py-3 text-[10px] text-slate-500 shadow-lg backdrop-blur transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="[writing-mode:vertical-rl]">Details</span>
        </button>
      )}

      {/* Contextual dialogs */}
      <BaselineComparison />
      <GroundTruthOverlay />
    </div>
  );
}
