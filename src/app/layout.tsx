import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TourProvider } from "@/lib/tour-context";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Tour de Alcoholism",
  description:
    "a running record of the bars we've survived — rank bars, find new ones, plan crawls, and split the bill.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) to resolve to anything but 0 — Shell's
  // fixed mobile nav already reads safe-area-inset-bottom for the home
  // indicator, but that value is a no-op without viewport-fit: "cover"
  // telling Safari the page draws under the safe areas in the first place.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MiA3MiI+CiAgPGRlZnM+CiAgICA8cGF0aCBpZD0idGRhLXN0YXIiIGQ9Ik0wIC02IEwtMS4zNSAtMS44NSBMLTUuNzEgLTEuODUgTC0yLjE4IDAuNzEgTC0zLjUzIDQuODUgTDAgMi4yOSBMMy41MyA0Ljg1IEwyLjE4IDAuNzEgTDUuNzEgLTEuODUgTDEuMzUgLTEuODUgWiIgZmlsbD0iI0Y3RjBFMSIvPgogIDwvZGVmcz4KICA8dXNlIGhyZWY9IiN0ZGEtc3RhciIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzYgOCkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1Mi40NiAxMy4zNSkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2Mi42MyAyNy4zNSkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2Mi42MyA0NC42NSkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1Mi40NiA1OC42NSkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNiA2NCkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxOS41NCAxMy4zNSkgc2NhbGUoMC44KSIvPgogIDx1c2UgaHJlZj0iI3RkYS1zdGFyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5LjM3IDI3LjM1KSBzY2FsZSgwLjgpIi8+CiAgPHVzZSBocmVmPSIjdGRhLXN0YXIiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDkuMzcgNDQuNjUpIHNjYWxlKDAuOCkiLz4KICA8dXNlIGhyZWY9IiN0ZGEtc3RhciIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTkuNTQgNTguNjUpIHNjYWxlKDAuOCkiLz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMC44NyAxOC4wMikgc2NhbGUoMC42MikiPgogICAgPHBhdGggZD0iTTM5IDMwIGg2IGE5IDkgMCAwIDEgMCAxOCBoLTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzE2MTMwRiIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxwYXRoIGQ9Ik0zOSAzMCBoNmE5IDkgMCAwIDEgMCAxOCBoLTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0RDRUFFRSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuOTIiLz4KICAgIDxyZWN0IHg9IjkiIHk9IjE4IiB3aWR0aD0iMzAiIGhlaWdodD0iNDIiIHJ4PSI1IiBmaWxsPSIjRTVCOTNGIiBmaWxsLW9wYWNpdHk9IjAuODgiIHN0cm9rZT0iIzE2MTMwRiIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIgc3Ryb2tlLXdpZHRoPSIzLjUiLz4KICAgIDxyZWN0IHg9IjEzIiB5PSIzOCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjYiIHJ4PSIxIiBmaWxsPSIjOEE2RDJGIiBvcGFjaXR5PSIwLjUiLz4KICAgIDxyZWN0IHg9IjE1IiB5PSIyNCIgd2lkdGg9IjUiIGhlaWdodD0iMzIiIHJ4PSIyLjUiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9IjAuNCIvPgogICAgPHJlY3QgeD0iMzIiIHk9IjI2IiB3aWR0aD0iMi41IiBoZWlnaHQ9IjI4IiByeD0iMS4yNSIgZmlsbD0iI0ZGRkZGRiIgb3BhY2l0eT0iMC4yMiIvPgogICAgPHBhdGggZD0iTTMuNiAyMi4wIEMyLjggMTMuMCA3LjkgNi4wIDEzLjAgOS4wIEMxNC43IDEuMCAyMi4zIC0xLjAgMjUuNyA1LjAgQzI5LjkgLTIuMCAzNy42IDEuMCAzNy42IDkuMCBDNDIuNyA3LjAgNDUuMiAxNS4wIDQxLjggMjIuMCBaIiBmaWxsPSIjRjdGMEUxIi8+CiAgPC9nPgo8L3N2Zz4="
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Fraunces now loads its TRUE italic (the masthead's "Alcoholism"
            was previously a browser-synthesized slant) across the full
            optical-size axis, so display sizes get the high-contrast cut.
            Barlow Condensed carries ranks, scores, and labels. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TourProvider>
          <Shell>{children}</Shell>
        </TourProvider>
      </body>
    </html>
  );
}
