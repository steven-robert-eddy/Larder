import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { runClippedImport } from "@/lib/import/web-import";

// The bookmarklet runs on whatever site the user is looking at (e.g.
// allrecipes.com), so this is a genuinely cross-origin request — no
// cookies involved, auth is a bearer token instead, which is exactly why
// a permissive CORS origin here is fine (nothing ambient to leak).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const MAX_HTML_CHARS = 8_000_000;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  if (!env.clipToken) {
    return NextResponse.json(
      { error: "Clipping isn't configured on this server (CLIP_TOKEN unset)." },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token || token !== env.clipToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = await request.text();
  if (raw.length > MAX_HTML_CHARS) {
    return NextResponse.json({ error: "That page is too large to import." }, { status: 413, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: CORS_HEADERS });
  }

  const url = typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url : null;
  const html = typeof (body as { html?: unknown })?.html === "string" ? (body as { html: string }).html : null;
  if (!url || !html) {
    return NextResponse.json({ error: "Missing url or html." }, { status: 400, headers: CORS_HEADERS });
  }

  // Single-user app — the clip token stands in for a session, so attach
  // the job to the one seeded user rather than requiring a login flow
  // the bookmarklet has no way to carry out.
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return NextResponse.json({ error: "No user found." }, { status: 500, headers: CORS_HEADERS });
  }

  const outcome = await runClippedImport(user.id, url, html);
  return NextResponse.json(
    { reviewUrl: `/import/${outcome.jobId}/review` },
    { headers: CORS_HEADERS },
  );
}
