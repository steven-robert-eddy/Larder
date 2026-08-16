import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config shared between the full auth.ts (Node runtime, used by
 * route handlers/server actions) and middleware.ts (Edge runtime). Keeping
 * providers out of this file keeps Prisma — which needs Node APIs — out of
 * the Edge middleware bundle.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
} satisfies NextAuthConfig;
