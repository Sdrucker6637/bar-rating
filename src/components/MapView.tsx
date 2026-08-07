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
// Interpolates between two #RRGGBB hex colors at fraction f (0..1).
function lerpHex(a: string, b: string, f: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number, dh: number) =>
    Math.round(sh + (dh - sh) * f);
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl)
    .toString(16)
    .slice(1)}`;
}

// Picks a color from a { stop: color } gradient at normalized position t.
function colorAtGradient(
  stops: Array<[number, string]>,
  t: number,
): string {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return lerpHex(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

type LNamespace = {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => {
    setView: (center: [number, number], zoom: number) => unknown;
    fitBounds: (bounds: unknown, opts?: unknown) => unknown;
    getZoom: () => number;
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
        getZoom: () => number;
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

      // Normalize each bar's score to the range of the bars actually shown, so
      // the best bar glows at the hot end and the worst sits at the cold end —
      // raw score/10 squeezed everything into one muddy band. Bars with no
      // ratings at all get a neutral middle position rather than looking like
      // the worst bar on the tour.
      const rawScores = geoBars.map((b) => avgWithFood(b) ?? avgWithoutFood(b));
      const scored = rawScores.filter((s): s is number => s !== null);
      const minScore = scored.length > 0 ? Math.min(...scored) : 5;
      const maxScore = scored.length > 0 ? Math.max(...scored) : 5;
      const span = maxScore - minScore;
      const tFor = (i: number) => {
        if (rawScores[i] === null) return 0.5; // no ratings → neutral
        return span > 0.001 ? (rawScores[i]! - minScore) / span : 0.5;
      };

      const points = geoBars.map((b, i) => {
        if (mode === "visited") {
          return [
            b.latitude,
            b.longitude,
            0.25 + tFor(i) * 0.75,
          ] as [number, number, number];
        }
        return [b.latitude, b.longitude, 0.6] as [number, number, number]; // no score to weight by on the wishlist
      });

      // leaflet.heat scales every point's intensity by 2^-(maxZoom - zoom),
      // so a hardcoded maxZoom far above the fitted view (12-ish) crushed all
      // intensities to near zero and made every point render as the cold end
      // of the gradient. Fit the view first, then use the actual fitted zoom
      // as maxZoom so intensities pass through at full strength by default.
      const bounds = L.latLngBounds(
        geoBars.map((b) => [b.latitude as number, b.longitude as number]),
      );
      map.fitBounds(bounds, { padding: [40, 40] });
      if (heatOk && (L as LNamespace).heatLayer) {
        L.heatLayer(points, {
          radius: 32,
          blur: 24,
          maxZoom: map.getZoom(),
          gradient: HEAT_GRADIENTS[mode],
        }).addTo(map);
      }

      const gradientStops = Object.entries(HEAT_GRADIENTS[mode]) as Array<
        [string, string]
      >;
      const stops = gradientStops
        .map(([stop, color]) => [Number(stop), color] as [number, string])
        .sort((a, b) => a[0] - b[0]);
      geoBars.forEach((b, i) => {
        const score = avgWithFood(b) ?? avgWithoutFood(b);
        const scoreLine =
          mode === "visited"
            ? `<div class="tda-map-popup-score">${fmt(score)} avg</div>`
            : '<div class="tda-map-popup-score tda-muted">Wishlist</div>';
        // Marker color follows the same gradient as the heat, so a bar's dot
        // matches its glow instead of every dot being the same gold.
        const dotColor =
          mode === "visited"
            ? colorAtGradient(stops, tFor(i))
            : HEAT_DOT_COLOR[mode];
        L.circleMarker([b.latitude as number, b.longitude as number], {
          radius: 7,
          // Cream ring separates each bar from the heat glow behind it — the
          // fill keeps the score-graded color, the ring makes the dot itself
          // pop against both the warm glow and the dark tiles.
          color: "#EDE6D9",
          weight: 2,
          fillColor: dotColor,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(
            `<div class="tda-map-popup-name">${b.name}</div>${scoreLine}`,
          );
      });

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
