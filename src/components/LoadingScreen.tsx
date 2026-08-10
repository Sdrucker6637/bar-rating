"use client";

import { useTour } from "@/lib/tour-context";

export default function LoadingScreen() {
  const { connError } = useTour();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0E0D10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      {connError ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            border: "1px solid #9A4B4B",
            background: "rgba(199,118,118,0.08)",
            borderRadius: "6px",
            padding: "0.85rem 1.1rem",
            color: "#C77676",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.85rem",
            letterSpacing: "0.02em",
          }}
        >
          <span aria-hidden="true">⚠</span>
          couldn&apos;t connect — check your Firebase config
        </div>
      ) : (
        <div
          style={{
            color: "#B8965F",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
          }}
        >
          setting the table…
        </div>
      )}
    </div>
  );
}
