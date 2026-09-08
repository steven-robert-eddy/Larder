import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { authConfig } from "./auth.config";

// Single shared passphrase rather than per-account email/password — this
// app is single-user (see design doc section 2). The User table and its
// passwordHash column still exist for a future real multi-user login;
// this gate just gets out of the way of the one person using it today.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        passphrase: { label: "Passphrase", type: "password" },
      },
      authorize: async (credentials) => {
        const passphrase = credentials?.passphrase;
        if (typeof passphrase !== "string" || passphrase !== env.authPassphrase) {
          return null;
        }

        const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
        if (!user) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
