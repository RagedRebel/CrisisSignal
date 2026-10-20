import React from "react";
import { Provenance } from "@/engine/types";

export function ProvenanceBadge({
  provenance,
  compact = false,
}: {
  provenance?: Provenance;
  compact?: boolean;
}) {
  // Every event in the Bengaluru replay is generated offline from the same
  // synthetic dataset, so there is only one provenance state to show.
  void provenance;

  return (
    <span
      title="Synthetic event generated offline for the Bengaluru flood replay. It is not a real message, bulletin or reading."
      className={`inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 font-mono text-amber-700 ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Simulated
    </span>
  );
}
