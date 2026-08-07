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
      }}
    >
      <div
        style={{
          color: "#B8965F",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.85rem",
          letterSpacing: "0.05em",
        }}
      >
        {connError
          ? "couldn't connect — check your Firebase config"
          : "setting the table…"}
      </div>
    </div>
  );
}
