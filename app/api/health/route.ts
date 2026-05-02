import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness probe. Returns 200 if the Next.js process is up.
 *
 * Future iterations will add a /api/health/ready endpoint that also pings
 * Postgres, but liveness vs. readiness is worth keeping separate so a slow
 * DB doesn't cycle the web tier.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", service: "stacktic-admin", ts: new Date().toISOString() },
    { status: 200 },
  );
}
