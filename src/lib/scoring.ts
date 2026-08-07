import { WALK_DETOUR_FACTOR, WALK_SPEED_MPS } from "./constants";
import type { Bar } from "./types";

export function avgWithFood(b: Bar): number | null {
  if (b.disqualified) return null;
  const vals = [b.vibe, b.value, b.service, b.food, b.drinks].filter(
    (v): v is number =>
      v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(Number(v)),
  );
  if (vals.length < 5) return null;
  return vals.reduce((a, c) => a + Number(c), 0) / vals.length;
}

export function avgWithoutFood(b: Bar): number | null {
  if (b.disqualified) return null;
  const vals = [b.vibe, b.value, b.service, b.drinks].filter(
    (v): v is number =>
      v !== null && v !== undefined && String(v).trim() !== "" && !isNaN(Number(v)),
  );
  if (vals.length < 4) return null;
  return vals.reduce((a, c) => a + Number(c), 0) / vals.length;
}

export function fmt(n: number | null | undefined): string {
  return n === null || n === undefined || isNaN(n)
    ? "—"
    : Number(n).toFixed(2);
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateWalkMinutes(meters: number): number {
  return (meters * WALK_DETOUR_FACTOR) / WALK_SPEED_MPS / 60;
}
