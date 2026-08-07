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
          href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPHBhdGggZD0iTTM5IDMwIGg2IGE5IDkgMCAwIDEgMCAxOCBoLTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzE2MTMwRiIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNMzkgMzAgaDZhOSA5IDAgMCAxIDAgMTggaC02IiBmaWxsPSJub25lIiBzdHJva2U9IiNEQ0VBRUUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjkyIi8+CiAgPHJlY3QgeD0iOSIgeT0iMTgiIHdpZHRoPSIzMCIgaGVpZ2h0PSI0MiIgcng9IjUiIGZpbGw9IiNFNUI5M0YiIGZpbGwtb3BhY2l0eT0iMC44OCIgc3Ryb2tlPSIjMTYxMzBGIiBzdHJva2Utb3BhY2l0eT0iMC41IiBzdHJva2Utd2lkdGg9IjMuNSIvPgogIDxyZWN0IHg9IjEzIiB5PSIzOCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjYiIHJ4PSIxIiBmaWxsPSIjOEE2RDJGIiBvcGFjaXR5PSIwLjUiLz4KICA8cmVjdCB4PSIxNSIgeT0iMjQiIHdpZHRoPSI1IiBoZWlnaHQ9IjMyIiByeD0iMi41IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjQiLz4KICA8cmVjdCB4PSIzMiIgeT0iMjYiIHdpZHRoPSIyLjUiIGhlaWdodD0iMjgiIHJ4PSIxLjI1IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjIyIi8+CiAgPHBhdGggZD0iTTMuNiAyMi4wIEMyLjggMTMuMCA3LjkgNi4wIDEzLjAgOS4wIEMxNC43IDEuMCAyMi4zIC0xLjAgMjUuNyA1LjAgQzI5LjkgLTIuMCAzNy42IDEuMCAzNy42IDkuMCBDNDIuNyA3LjAgNDUuMiAxNS4wIDQxLjggMjIuMCBaIiBmaWxsPSIjRjdGMEUxIi8+Cjwvc3ZnPgo="
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
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
