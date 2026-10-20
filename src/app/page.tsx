"use client";

import React from "react";
import { SimulationBar } from "@/components/simulation/SimulationBar";
import { IncidentQueue } from "@/components/console/IncidentQueue";
import { MapView } from "@/components/map/MapView";
import { DetailPanel } from "@/components/console/DetailPanel";
import { Lanes } from "@/components/console/Lanes";
import { BaselineComparison } from "@/components/simulation/BaselineComparison";
import { GroundTruthOverlay } from "@/components/simulation/GroundTruthOverlay";

export default function CoordinatorConsolePage() {
  return (
    <div className="flex h-screen w-screen flex-col bg-[#090d16] text-foreground overflow-hidden">
      {/* Top Simulation Control Bar */}
      <SimulationBar />

      {/* Main 3-Panel Tactical Console */}
      <div className="relative flex overflow-hidden min-w-0">
        {/* Left Panel: Ranked Queue & Lane Toggles */}
        <div className="w-[340px] shrink-0 border-r border-border h-full overflow-hidden flex flex-col">
          <IncidentQueue />
        </div>

        {/* Center Panel: Interactive Tactical Map */}
        <div className="relative flex-1 min-w-0 h-full overflow-hidden">
          <MapView />
        </div>

        {/* Right Panel: Explainability "Why #1" Panel & Evidence View */}
        <div className="w-[420px] shrink-0 border-l border-border h-full overflow-hidden flex flex-col">
          <DetailPanel />
        </div>

        {/* Contextual Overlays */}
        <Lanes />
        <BaselineComparison />
        <GroundTruthOverlay />
      </div>

      {/* Mandatory Simulated Disclaimer Footer */}
      <footer className="border-t border-border bg-[#0b1120] px-4 py-1.5 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400 font-mono tracking-wider">
            [HISTORICAL REPLAY]
          </span>
          <span>
            Historical replay on real 2022 flood dates with 100% synthetic events. Not live data. Dispatch actions are simulated.
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
          <span>Engine: Pure TypeScript Deterministic</span>
          <span>•</span>
          <span>Bengaluru 2022 Flood Replay</span>
        </div>
      </footer>
    </div>
  );
}
