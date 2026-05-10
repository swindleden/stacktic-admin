# syntax=docker/dockerfile:1.9

# Multi-stage Dockerfile for site-admin — Stacktic's internal operator
# console (backstage.stacktic.{dev,app}). Mirrors the site-app Dockerfile
# pattern: deps → builder → runner, with the runner stage stripped of
# pnpm/corepack to keep the runtime image small.
#
# Different from site-app:
#   - Uses pnpm 9.12.3 (matches site-admin's package.json)
#   - No worker entry point (site-admin is web-only)
#   - Listens on 3000 in production (overrides package.json's --port 3100
#     default so the ECS target group config matches site-app's)

ARG NODE_VERSION=20.18.0
ARG PNPM_VERSION=9.12.3

# ---------- Stage 1: deps ----------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
ARG PNPM_VERSION
WORKDIR /app

RUN npm install -g corepack@latest \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=stacktic-admin-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod=false --frozen-lockfile

# ---------- Stage 2: builder ----------
FROM node:${NODE_VERSION}-bookworm-slim AS builder
ARG PNPM_VERSION
WORKDIR /app

RUN npm install -g corepack@latest \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholder env vars so `next build`'s page-data collection doesn't
# trip on imports that read process.env at module load. Real values come
# from ECS task definition env vars at runtime.
ENV DATABASE_URL=postgres://build-placeholder@localhost:5432/build

RUN pnpm build

# ---------- Stage 3: runner ----------
#
# Runtime image. Does NOT install pnpm/corepack — node + node_modules is
# all we need. Same justification as site-app:
#   - Saves ~30MB
#   - Avoids the corepack-needs-writable-home failure mode for non-root user
#   - Smaller attack surface

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user. --create-home so $HOME exists for any tooling that
# probes it at startup.
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

# Override package.json's --port 3100 to use 3000 in production. Keeps
# ECS target group config consistent with site-app. Local dev still uses
# 3100 (via `pnpm dev`) to avoid clashing with site-app's 3000.
CMD ["./node_modules/.bin/next", "start", "--port", "3000"]
