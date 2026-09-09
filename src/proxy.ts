import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe: built from authConfig alone (no Credentials provider, no
// Prisma), so it can decode the session JWT without pulling Node-only
// dependencies into the Edge middleware bundle. See auth.config.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  // The clip bookmarklet and the iOS Shortcuts share action both
  // authenticate with the same bearer token instead of a session cookie
  // — neither runs in a context that can carry ours (a third-party
  // origin for the bookmarklet, a native automation for Shortcuts). See
  // src/app/api/import/clip/route.ts and src/app/api/import/share/route.ts.
  const isTokenApi =
    req.nextUrl.pathname.startsWith("/api/import/clip") || req.nextUrl.pathname.startsWith("/api/import/share");

  if (isAuthApi || isTokenApi) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    // Preserve the full path + query, not just the pathname — the share
    // target route (src/app/(app)/import/share-target) carries the
    // shared text/url as query params, and those would otherwise be
    // silently dropped if the user shares into the app while logged out.
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/recipes", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
