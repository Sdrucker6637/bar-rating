"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Bar } from "@/lib/types";
import { avgWithFood, avgWithoutFood, fmt } from "@/lib/scoring";
import { HEAT_GRADIENTS, HEAT_DOT_COLOR } from "@/lib/constants";

interface MapViewProps {
  bars: Bar[];
}

// Minimal surface of the Leaflet namespace we use. The real type comes from
// @types/leaflet via the module's `default` export (UMD interop); heatLayer is
// added at runtime by the leaflet.heat side-effect import.
type LNamespace = {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => {
    setView: (center: [number, number], zoom: number) => unknown;
    fitBounds: (bounds: unknown, opts?: unknown) => unknown;
    invalidateSize: () => unknown;
    remove: () => void;
  };
  tileLayer: (url: string, opts?: Record<string, unknown>) => {
    addTo: (map: unknown) => unknown;
  };
  heatLayer: (
    points: Array<[number, number, number]>,
    opts?: Record<string, unknown>,
  ) => { addTo: (map: unknown) => unknown };
  circleMarker: (
    latlng: [number, number],
    opts?: Record<string, unknown>,
  ) => {
    addTo: (map: unknown) => { bindPopup: (html: string) => unknown };
  };
  latLngBounds: (
    points: Array<[number, number]>,
  ) => {
    pad: (n: number) => unknown;
  };
};

export default function MapView({ bars }: MapViewProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"visited" | "wishlist">("visited");

  const visitedGeo = useMemo(
    () =>
      bars.filter(
        (b) =>
          b.status === "visited" &&
          !b.disqualified &&
          Number.isFinite(b.latitude) &&
          Number.isFinite(b.longitude),
      ),
    [bars],
  );
  const wishlistGeo = useMemo(
    () =>
      bars.filter(
        (b) =>
          b.status === "to-try" &&
          Number.isFinite(b.latitude) &&
          Number.isFinite(b.longitude),
      ),
    [bars],
  );
  const geoBars = mode === "visited" ? visitedGeo : wishlistGeo;

  // leaflet.heat is a UMD plugin that attaches itself to a global `L` (it does
  // not play well with bundlers), so it's loaded as a classic <script> after
  // Leaflet itself is imported — exactly how the original app loaded it from a
  // CDN. The load promise is cached at module level so rapid mode toggles
  // reuse the in-flight (or settled) load instead of racing a fresh script tag.
  let heatPluginPromise: Promise<void> | null = null;
  function loadHeatPlugin(): Promise<void> {
    if (!heatPluginPromise) {
      heatPluginPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
        s.dataset.leafletHeat = "true";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load leaflet.heat"));
        document.head.appendChild(s);
      });
    }
    return heatPluginPromise;
  }

  useEffect(() => {
    const node = mapNodeRef.current;
    if (!node || geoBars.length === 0) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    // Leaflet touches `window` at import time, so load it lazily on the client
    // only — never during SSR.
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(async ([leafletMod]) => {
        if (cancelled || !mapNodeRef.current) return;
        // UMD interop: leaflet's real export is the namespace under `default`.
        const mod = leafletMod as unknown as {
          default: LNamespace;
        };
        const L = mod.default;
        // Give the UMD heat plugin the global it expects, then load it.
        (window as unknown as Record<string, unknown>).L = L;
        let heatOk = false;
        try {
          await loadHeatPlugin();
          heatOk = true;
        } catch (e) {
          console.error("[map] heat plugin unavailable", e);
        }
        // The await above may have resolved after unmount / navigation.
        if (cancelled || !node.isConnected) return;

        const map = L.map(node, {
        scrollWheelZoom: true,
      }).setView([40.7128, -74.006], 12) as unknown as {
        fitBounds: (b: unknown, o?: unknown) => void;
        invalidateSize: () => void;
        remove: () => void;
      };

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          maxZoom: 19,
        },
      ).addTo(map);

      const points = geoBars.map((b) => {
        if (mode === "visited") {
          const score = avgWithFood(b) ?? avgWithoutFood(b) ?? 5;
          return [b.latitude, b.longitude, Math.max(0.25, score / 10)] as [
            number,
            number,
            number,
          ];
        }
        return [b.latitude, b.longitude, 0.6] as [number, number, number]; // no score to weight by on the wishlist
      });

      if (heatOk && (L as LNamespace).heatLayer) {
        L.heatLayer(points, {
          radius: 32,
          blur: 24,
          maxZoom: 17,
          gradient: HEAT_GRADIENTS[mode],
        }).addTo(map);
      }

      const dotColor = HEAT_DOT_COLOR[mode];
      geoBars.forEach((b) => {
        const score = avgWithFood(b) ?? avgWithoutFood(b);
        const scoreLine =
          mode === "visited"
            ? `<div class="tda-map-popup-score">${fmt(score)} avg</div>`
            : '<div class="tda-map-popup-score tda-muted">Wishlist</div>';
        L.circleMarker([b.latitude as number, b.longitude as number], {
          radius: 6,
          color: dotColor,
          weight: 1,
          fillColor: dotColor,
          fillOpacity: 0.85,
        })
          .addTo(map)
          .bindPopup(
            `<div class="tda-map-popup-name">${b.name}</div>${scoreLine}`,
          );
      });

      const bounds = L.latLngBounds(
        geoBars.map((b) => [b.latitude as number, b.longitude as number]),
      );
      map.fitBounds(bounds, { padding: [40, 40] });

      setTimeout(() => map.invalidateSize(), 100);

      cleanup = () => map.remove();
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [geoBars, mode]);

  if (geoBars.length === 0) {
    return (
      <div>
        <div className="mb-4 inline-flex overflow-hidden rounded-full border border-line2">
          <button
            className={`px-3.5 py-1.5 font-mono text-[0.72rem] ${
              mode === "visited"
                ? "bg-brass font-semibold text-deep"
                : "bg-transparent text-mist"
            }`}
            onClick={() => setMode("visited")}
          >
            Visited
          </button>
          <button
            className={`px-3.5 py-1.5 font-mono text-[0.72rem] ${
              mode === "wishlist"
                ? "bg-brass font-semibold text-deep"
                : "bg-transparent text-mist"
            }`}
            onClick={() => setMode("wishlist")}
          >
            Wishlist
          </button>
        </div>
        <div className="py-10 text-center font-mono text-[0.85rem] text-mute">
          {mode === "visited"
            ? "No visited bars have coordinates yet — coordinates are captured automatically when you add a bar through the Google Places lookup."
            : "No wishlist bars have coordinates yet — coordinates are captured automatically when you add a bar through the Google Places lookup."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <div ref={mapNodeRef} className="tda-heatmap-container" />
        <div
          className="absolute right-3 top-3 z-[1000] inline-flex overflow-hidden rounded-full border border-line2 shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
          style={{ background: "rgba(23,20,27,0.9)", backdropFilter: "blur(4px)" }}
        >
          <button
            className={`px-3.5 py-1.5 font-mono text-[0.72rem] ${
              mode === "visited"
                ? "bg-brass font-semibold text-deep"
                : "bg-transparent text-mist"
            }`}
            onClick={() => setMode("visited")}
          >
            Visited
          </button>
          <button
            className={`px-3.5 py-1.5 font-mono text-[0.72rem] ${
              mode === "wishlist"
                ? "bg-brass font-semibold text-deep"
                : "bg-transparent text-mist"
            }`}
            onClick={() => setMode("wishlist")}
          >
            Wishlist
          </button>
        </div>
      </div>
      <div className="mt-4 font-mono text-[0.72rem] text-mute">
        {geoBars.length} bar{geoBars.length === 1 ? "" : "s"} plotted.
      </div>
      <div className="mt-2.5 flex items-center gap-2.5 font-mono text-[0.68rem] text-mute">
        bottom tier
        <span
          className="h-2 w-[120px] rounded-[4px]"
          style={{
            background: `linear-gradient(90deg, ${Object.values(
              HEAT_GRADIENTS[mode],
            ).join(",")})`,
          }}
        />
        {mode === "visited" ? "top rated" : "denser cluster"}
      </div>
    </div>
  );
}
