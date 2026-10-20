"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { BENGALURU_CITY } from "@/data/city";
import { Layers, AlertTriangle, ShieldAlert, Sparkles, Navigation } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function MapInner() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const {
    incidents,
    wards,
    selectedIncidentId,
    selectIncident,
    showGroundTruth,
    assignWelfareCheck,
  } = useCrisisStore();

  const [showSilenceLayer, setShowSilenceLayer] = useState(true);
  const [showUncertaintyCircles, setShowUncertaintyCircles] = useState(true);
  const [showRiver, setShowRiver] = useState(true);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [selectedWardForCheck, setSelectedWardForCheck] = useState<string | null>(null);
  const [checkActionType, setCheckActionType] = useState<"volunteer_call" | "boat_patrol" | "drone_recon">("boat_patrol");
  const [checkNotes, setCheckNotes] = useState("");

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BENGALURU_CITY.center,
      zoom: BENGALURU_CITY.zoom,
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
      minZoom: 9,
      maxZoom: 17,
    });

    // Online street basemap: CARTO "dark_all" raster tiles (OSM data) are dark
    // natively, matching the control-room theme. Attribution is rendered in the
    // corner badge instead of Leaflet's default control.
    const tileLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map);

    // If the network drops, fall back to the offline schematic look instead of
    // leaving a blank base under the overlays.
    let tileErrorCount = 0;
    tileLayer.on("tileerror", () => {
      tileErrorCount += 1;
      if (tileErrorCount >= 4) setTilesUnavailable(true);
    });
    tileLayer.on("tileload", () => {
      tileErrorCount = 0;
      setTilesUnavailable((prev) => (prev ? false : prev));
    });

    // Reading-aid graticule drawn locally on top of the basemap. Zone polygons,
    // rivers and incident pins render above it.
    const graticule = L.layerGroup().addTo(map);
    for (let lat = 12.6; lat <= 13.4; lat += 0.2) {
      L.polyline(
        [
          [lat, 77.2],
          [lat, 78.2],
        ],
        { color: "#1e293b", weight: 1, opacity: 0.55, interactive: false }
      ).addTo(graticule);
    }
    for (let lng = 77.2; lng <= 78.2; lng += 0.2) {
      L.polyline(
        [
          [12.6, lng],
          [13.4, lng],
        ],
        { color: "#1e293b", weight: 1, opacity: 0.55, interactive: false }
      ).addTo(graticule);
    }

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Layers & Markers whenever state updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Ensure Leaflet recalculates dimensions if the container was sized after
    // initial map creation (common in flex layouts).
    map.invalidateSize();

    layerGroup.clearLayers();

    // 1. Draw the Vrishabhavathi valley and the stormwater valleys that flooded
    if (showRiver) {
      const riverPoly = L.polyline(BENGALURU_CITY.riverPolyline, {
        color: "#0284c7",
        weight: 9,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "1, 0",
      });
      riverPoly.bindTooltip("Vrishabhavathi River", { sticky: true });
      layerGroup.addLayer(riverPoly);

      const valleyNames = [
        "Koramangala Stormwater Valley",
        "Hebbal Valley",
        "Jakkur Overflow Channel",
      ];
      (BENGALURU_CITY.tributaryPolylines || []).forEach((tributary, index) => {
        const tributaryPoly = L.polyline(tributary, {
          color: "#0ea5e9",
          weight: 4,
          opacity: 0.7,
          lineCap: "round",
          lineJoin: "round",
          dashArray: "6, 5",
        });
        tributaryPoly.bindTooltip(valleyNames[index] || "Stormwater Valley", {
          sticky: true,
        });
        layerGroup.addLayer(tributaryPoly);
      });
    }

    // 2. Draw Ward Boundaries and Silence Heatmap
    if (showSilenceLayer) {
      wards.forEach((ward) => {
        const isFlagged = ward.is_flagged_silent;
        const score = ward.silence_score;

        let fillColor = "#1e293b";
        let fillOpacity = 0.2;
        let borderColor = "#334155";
        let borderWeight = 1;

        if (isFlagged) {
          fillColor = "#9333ea"; // Purple for silent zones needing attention
          fillOpacity = 0.35 + score * 0.25;
          borderColor = "#c084fc";
          borderWeight = 2;
        } else if (ward.flood_exposure > 0.7) {
          fillColor = "#0369a1";
          fillOpacity = 0.25;
        }

        const polygon = L.polygon(ward.boundary_polygon, {
          color: borderColor,
          weight: borderWeight,
          fillColor,
          fillOpacity,
        });

        const tooltipContent = `
          <div style="font-size: 11px; padding: 2px;">
            <b style="color: #38bdf8;">${ward.name} (${ward.code})</b><br/>
            Silence Score: <b style="color: ${isFlagged ? '#e879f9' : '#94a3b8'};">${score.toFixed(2)}</b> ${
          isFlagged ? "⚠️ POSSIBLE UNREPORTED NEED" : ""
        }<br/>
            Reports: ${ward.actual_reports_count} of ${ward.expected_reports_count} expected<br/>
            Connectivity Gap: ${((1 - ward.connectivity_index) * 100).toFixed(0)}%
          </div>
        `;
        polygon.bindTooltip(tooltipContent, { sticky: true });

        polygon.on("click", () => {
          if (isFlagged) {
            setSelectedWardForCheck(ward.id);
          }
        });

        layerGroup.addLayer(polygon);
      });
    }

    // 3. Draw Active Incidents
    incidents.forEach((inc) => {
      if (!inc.location.coords) return;

      const isSelected = inc.id === selectedIncidentId;
      const isUrgentVerify = inc.is_verify_urgently;
      const lat = inc.location.coords.lat;
      const lng = inc.location.coords.lng;

      // Draw uncertainty circle
      if (showUncertaintyCircles && inc.location.uncertainty_radius_m > 30) {
        const circle = L.circle([lat, lng], {
          radius: inc.location.uncertainty_radius_m,
          color: isUrgentVerify ? "#ef4444" : isSelected ? "#38bdf8" : "#f59e0b",
          fillColor: isUrgentVerify ? "#ef4444" : "#f59e0b",
          fillOpacity: isSelected ? 0.25 : 0.12,
          weight: 1.5,
          dashArray: "4, 4",
        });
        layerGroup.addLayer(circle);
      }

      // Marker icon
      const scorePercent = Math.round(inc.urgency_score * 100);
      const markerColor =
        inc.priority_rank <= 2
          ? "#ef4444"
          : inc.priority_rank <= 5
          ? "#f97316"
          : inc.priority_rank <= 8
          ? "#eab308"
          : "#3b82f6";

      const html = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${markerColor};
          color: white;
          font-weight: 800;
          font-size: 11px;
          border: 2px solid ${isSelected ? "#ffffff" : "#0f172a"};
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          cursor: pointer;
        ">
          #${inc.priority_rank}
          ${
            isUrgentVerify
              ? `<div style="position: absolute; top: -6px; right: -6px; width: 14px; height: 14px; background: #dc2626; border-radius: 50%; border: 1.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 8px;">!</div>`
              : ""
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: "custom-incident-pin",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on("click", () => {
        selectIncident(inc.id);
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; max-width: 240px; padding: 2px;">
          <div style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">#${inc.priority_rank} ${inc.title}</div>
          <div>Urgency: <b>${scorePercent}%</b> | Reliability: <b>${inc.reliability_score}/100</b></div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">Merged from ${inc.source_report_ids.length} reports</div>
          ${
            isUrgentVerify
              ? `<div style="color: #ef4444; font-weight: bold; margin-top: 4px;">⚠️ VERIFY URGENTLY</div>`
              : ""
          }
          ${
            inc.fairness_boost_applied
              ? `<div style="color: #a855f7; font-weight: bold; margin-top: 2px;">★ Fairness Boost Applied</div>`
              : ""
          }
        </div>
      `);

      layerGroup.addLayer(marker);
    });
  }, [
    incidents,
    wards,
    selectedIncidentId,
    showSilenceLayer,
    showUncertaintyCircles,
    showRiver,
    selectIncident,
  ]);

  const activeWard = wards.find((w) => w.id === selectedWardForCheck);

  const handleWelfareCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWardForCheck) return;
    assignWelfareCheck(
      selectedWardForCheck,
      checkActionType,
      checkNotes || "Standard welfare scout verification",
      "Coordinator assigned field reconnaissance based on Silence Layer anomaly"
    );
    setSelectedWardForCheck(null);
    setCheckNotes("");
  };

  return (
    <div className="relative h-full w-full min-w-0 bg-[#0b1120]">
      {/* Leaflet map container */}
      <div ref={mapContainerRef} className="h-full w-full min-w-[300px]" />

      {/* Layer Controls Bar (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 rounded-lg border border-border bg-[#0f172a]/90 p-2 text-xs shadow-xl backdrop-blur-sm">
        <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px] mb-1">
          <Layers className="h-3 w-3 text-primary" /> Map Layers
        </span>

        <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showSilenceLayer}
            onChange={(e) => setShowSilenceLayer(e.target.checked)}
            className="rounded border-slate-700 text-purple-600 focus:ring-0"
          />
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            Silence Zones (Equity)
          </span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showUncertaintyCircles}
            onChange={(e) => setShowUncertaintyCircles(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 focus:ring-0"
          />
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            Uncertainty Circles
          </span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showRiver}
            onChange={(e) => setShowRiver(e.target.checked)}
            className="rounded border-slate-700 text-sky-500 focus:ring-0"
          />
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            Valley Channels (Stormwater)
          </span>
        </label>
      </div>

      {/* Basemap attribution / offline fallback notice */}
      <div className="absolute bottom-3 right-3 z-[1000] max-w-[430px] rounded border border-slate-800 bg-[#0f172a]/80 px-2 py-1 text-[10px] text-slate-500 backdrop-blur-sm">
        {tilesUnavailable ? (
          <>Streets unavailable — schematic base · district polygons &amp; rivers</>
        ) : (
          <>
            Streets &copy;{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
            >
              OpenStreetMap
            </a>{" "}
            contributors &copy;{" "}
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
            >
              CARTO
            </a>{" "}
            — schematic overlays: wards, rivers, incidents
          </>
        )}
      </div>

      {/* Legend Badge (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-border bg-[#0f172a]/90 p-2.5 text-[11px] shadow-lg backdrop-blur-sm space-y-1">
        <div className="font-semibold text-slate-300">Priority Tier Pins</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span> #1-2 Critical
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span> #3-5 High
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span> #6-8 Med
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span> Lower
          </span>
        </div>
      </div>

      {/* Assign Welfare Check Modal for Flagged Silent Zone */}
      {selectedWardForCheck && activeWard && (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-purple-500/50 bg-[#0f172a] p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-400 mb-2 font-bold text-sm">
              <ShieldAlert className="h-5 w-5 text-purple-400" />
              <span>Silence Layer Flag: {activeWard.name}</span>
            </div>

            <div className="rounded bg-purple-950/40 border border-purple-900/60 p-2.5 text-xs text-purple-200 mb-3 space-y-1">
              <p className="font-semibold">
                Silence Score: {activeWard.silence_score.toFixed(2)} (Threshold: 0.60)
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-purple-300/90">
                {activeWard.silence_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-slate-400 italic mb-4">
              &quot;Prompt for human attention, not a claim that people are in danger. Silent zones never auto-convert into incidents.&quot;
            </p>

            <form onSubmit={handleWelfareCheckSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assign Welfare Check Method
                </label>
                <select
                  value={checkActionType}
                  onChange={(e) => setCheckActionType(e.target.value as any)}
                  className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  <option value="boat_patrol">SDRF Flood Rescue Boat Patrol</option>
                  <option value="drone_recon">Emergency Drone / Satellite Reconnaissance</option>
                  <option value="volunteer_call">Ham Radio / Local Volunteer Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Instructions / Dispatch Notes
                </label>
                <textarea
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="e.g. Check lower embankment old age clusters; test for power blackout..."
                  rows={2}
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedWardForCheck(null)}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="rounded bg-purple-600 hover:bg-purple-500 px-4 py-1.5 text-xs font-semibold text-white"
                >
                  Assign Welfare Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
