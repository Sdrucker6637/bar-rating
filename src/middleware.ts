import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

// Per-IP request caps on the API routes that call metered third-party APIs
// (Google Places, Gemini) — without this, a scripted flood of distinct
// requests bypasses the Firestore caches in those routes and bills every
// single hit. split-receipt gets the tightest cap since it sends image
// payloads to Gemini, the most expensive call in this app.
const ROUTE_LIMITS: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/api/split-receipt", limit: 5, windowMs: 60_000 },
  { prefix: "/api/gemini", limit: 10, windowMs: 60_000 },
  { prefix: "/api/places", limit: 20, windowMs: 60_000 },
];
const DEFAULT_LIMIT = { limit: 30, windowMs: 60_000 };

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const matched = ROUTE_LIMITS.find((r) => pathname.startsWith(r.prefix));
  const { limit, windowMs } = matched || DEFAULT_LIMIT;

  const bucketKey = `${matched ? matched.prefix : pathname}:${clientIp(req)}`;
  const result = checkRateLimit(bucketKey, limit, windowMs);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
