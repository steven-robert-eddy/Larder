import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { runShareTargetImport } from "@/lib/import/paste-import";

// iOS has no Web Share Target API (Safari doesn't implement it — see
// /import/share-target, which is Android/Chrome only), so this is the
// iPhone equivalent: an iOS Shortcut, added to the share sheet, POSTs
// here instead. Same bearer-token pattern as the clip bookmarklet — a
// Shortcut's "Get Contents of URL" action is a native HTTP call, not a
// browser, so there's no session cookie to carry either way.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const MAX_BODY_CHARS = 200_000;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  if (!env.clipToken) {
    return NextResponse.json(
      { error: "Sharing isn't configured on this server (CLIP_TOKEN unset)." },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token || token !== env.clipToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "That share is too large." }, { status: 413, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: CORS_HEADERS });
  }

  const field = (key: string): string | undefined => {
    const value = (body as Record<string, unknown>)?.[key];
    return typeof value === "string" ? value : undefined;
  };

  const shared = { title: field("title"), text: field("text"), url: field("url") };
  if (!shared.title && !shared.text && !shared.url) {
    return NextResponse.json({ error: "Nothing was shared." }, { status: 400, headers: CORS_HEADERS });
  }

  // Single-user app — the token stands in for a session, so attach the
  // job to the one seeded user rather than requiring a login flow the
  // Shortcut has no way to carry out.
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return NextResponse.json({ error: "No user found." }, { status: 500, headers: CORS_HEADERS });
  }

  const outcome = await runShareTargetImport(user.id, shared);
  return NextResponse.json(
    { reviewUrl: `/import/${outcome.jobId}/review` },
    { headers: CORS_HEADERS },
  );
}
