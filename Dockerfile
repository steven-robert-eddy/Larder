# syntax=docker/dockerfile:1
FROM node:22-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder so `next build` can resolve env access at build time; real
# values are supplied at runtime via docker-compose / the environment.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma's engines need OpenSSL to detect the libssl version; node:22-slim
# doesn't include it, which otherwise produces a (non-fatal, but noisy)
# "failed to detect the libssl/openssl version" warning on every command.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# prisma/seed.ts runs via tsx directly (not through the Next.js bundle),
# so its relative imports (../src/lib/taxonomy, ../src/generated/prisma)
# need the real source files here, not just the compiled server output.
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
# The full node_modules (not just standalone's traced subset) so
# `prisma migrate deploy` / `prisma db seed`, run directly rather than
# through the Next.js bundle, can resolve their own dependency trees
# (e.g. tsx's esbuild dependency) without hand-picking packages.
# --chown matters here specifically: Prisma writes into
# node_modules/@prisma/engines at runtime (engine checksum/path caching),
# which fails under the non-root `nextjs` user otherwise.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
