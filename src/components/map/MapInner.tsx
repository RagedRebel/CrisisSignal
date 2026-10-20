"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCrisisStore } from "@/store/useCrisisStore";
import { BENGALURU_CITY } from "@/data/city";
import { Layers, AlertTriangle, ShieldAlert, Sparkles, Navigation, ZoomIn, ZoomOut } from "lucide-react";
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
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      minZoom: 9,
      maxZoom: 17,
    });

    // Key-free OpenStreetMap raster tiles. No API key is required.
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

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
        { color: "#cbd5e1", weight: 1, opacity: 0.7, interactive: false }
      ).addTo(graticule);
    }
    for (let lng = 77.2; lng <= 78.2; lng += 0.2) {
      L.polyline(
        [
          [12.6, lng],
          [13.4, lng],
        ],
        { color: "#cbd5e1", weight: 1, opacity: 0.7, interactive: false }
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

        let fillColor = "#cbd5e1";
        let fillOpacity = 0.18;
        let borderColor = "#94a3b8";
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
            <b style="color: #0284c7;">${ward.name} (${ward.code})</b><br/>
            Silence Score: <b style="color: ${isFlagged ? '#a21caf' : '#475569'};">${score.toFixed(2)}</b> ${
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
          color: isUrgentVerify ? "#dc2626" : isSelected ? "#0284c7" : "#d97706",
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
          border: 2px solid #ffffff;
          box-shadow: ${isSelected ? "0 0 0 3px rgba(2,132,199,0.35), 0 4px 10px rgba(15,23,42,0.28)" : "0 3px 8px rgba(15,23,42,0.25)"};
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
        window.dispatchEvent(new CustomEvent("crisissignal:incident-selected"));
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; max-width: 240px; padding: 2px;">
          <div style="font-weight: bold; color: #0284c7; margin-bottom: 4px;">#${inc.priority_rank} ${inc.title}</div>
          <div>Urgency: <b>${scorePercent}%</b> | Reliability: <b>${inc.reliability_score}/100</b></div>
          <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Merged from ${inc.source_report_ids.length} reports</div>
          ${
            isUrgentVerify
              ? `<div style="color: #dc2626; font-weight: bold; margin-top: 4px;">⚠️ VERIFY URGENTLY</div>`
              : ""
          }
          ${
            inc.fairness_boost_applied
              ? `<div style="color: #7e22ce; font-weight: bold; margin-top: 2px;">★ Fairness Boost Applied</div>`
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
    <div className="relative h-full w-full min-w-0 bg-white">
      {/* Leaflet map container */}
      <div ref={mapContainerRef} className="h-full w-full min-w-[300px]" />

      {/* Layer Controls Bar (Top Center) */}
      <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[10px] shadow-md backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <Layers className="h-3 w-3" /> <span className="hidden xl:inline">Layers</span>
          </span>

          <label
            title="Silence zones"
            className="flex cursor-pointer items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900"
          >
            <input
              type="checkbox"
              checked={showSilenceLayer}
              onChange={(e) => setShowSilenceLayer(e.target.checked)}
              className="h-3 w-3 rounded border-slate-300 accent-purple-500"
            />
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
            <span className="hidden xl:inline">Silence zones</span>
          </label>

          <label
            title="Uncertainty circles"
            className="flex cursor-pointer items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900"
          >
            <input
              type="checkbox"
              checked={showUncertaintyCircles}
              onChange={(e) => setShowUncertaintyCircles(e.target.checked)}
              className="h-3 w-3 rounded border-slate-300 accent-amber-500"
            />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            <span className="hidden xl:inline">Uncertainty</span>
          </label>

          <label
            title="Stormwater valleys"
            className="flex cursor-pointer items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900"
          >
            <input
              type="checkbox"
              checked={showRiver}
              onChange={(e) => setShowRiver(e.target.checked)}
              className="h-3 w-3 rounded border-slate-300 accent-sky-500"
            />
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            <span className="hidden xl:inline">Valleys</span>
          </label>

          <span className="h-3.5 w-px bg-slate-200" />

          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom in"
            className="rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom out"
            className="rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Basemap attribution / offline fallback notice */}
      <div className="absolute bottom-1 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap rounded bg-white/70 px-2 py-0.5 text-[9px] text-slate-500 backdrop-blur-sm">
        {tilesUnavailable ? (
          <>Streets unavailable — schematic base · district polygons &amp; rivers</>
        ) : (
          <>
            Streets &copy;{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
            >
              OpenStreetMap
            </a>{" "}
            contributors — overlays are schematic
          </>
        )}
      </div>

      {/* Legend Badge (Bottom Center) */}
      <div className="absolute bottom-7 left-1/2 z-[1000] -translate-x-1/2 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] shadow-md backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-500">Priority</span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-red-500"></span> #1–2
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-orange-500"></span> #3–5
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span> #6–8
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span> Lower
          </span>
        </div>
      </div>

      {/* Assign Welfare Check Modal for Flagged Silent Zone */}
      {selectedWardForCheck && activeWard && (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-purple-200 bg-white p-5 shadow-2xl">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-purple-700">
              <ShieldAlert className="h-5 w-5 text-purple-500" />
              <span>Silence Layer Flag: {activeWard.name}</span>
            </div>

            <div className="rounded bg-purple-50 border border-purple-200 p-2.5 text-xs text-purple-700 mb-3 space-y-1">
              <p className="font-semibold">
                Silence Score: {activeWard.silence_score.toFixed(2)} (Threshold: 0.60)
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-purple-600/90">
                {activeWard.silence_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-slate-500 italic mb-4">
              &quot;Prompt for human attention, not a claim that people are in danger. Silent zones never auto-convert into incidents.&quot;
            </p>

            <form onSubmit={handleWelfareCheckSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Assign Welfare Check Method
                </label>
                <select
                  value={checkActionType}
                  onChange={(e) => setCheckActionType(e.target.value as any)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="boat_patrol">SDRF Flood Rescue Boat Patrol</option>
                  <option value="drone_recon">Emergency Drone / Satellite Reconnaissance</option>
                  <option value="volunteer_call">Ham Radio / Local Volunteer Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Instructions / Dispatch Notes
                </label>
                <textarea
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="e.g. Check lower embankment old age clusters; test for power blackout..."
                  rows={2}
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedWardForCheck(null)}
                  className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
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
