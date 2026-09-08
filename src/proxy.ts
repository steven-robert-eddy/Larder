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
  // The clip bookmarklet authenticates with its own bearer token (it runs
  // on arbitrary third-party origins, so it can't carry our session
  // cookie) — see src/app/api/import/clip/route.ts.
  const isClipApi = req.nextUrl.pathname.startsWith("/api/import/clip");

  if (isAuthApi || isClipApi) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
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
