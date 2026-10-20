"use client";

import dynamic from "next/dynamic";
import React from "react";

const MapInner = dynamic(
  () => import("./MapInner").then((mod) => mod.MapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0b1120] text-slate-400 text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Initializing Bengaluru Replay Map...</span>
        </div>
      </div>
    ),
  }
);

export function MapView() {
  return <MapInner />;
}
