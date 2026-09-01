# Production image for the self-hosted OVH deployment (see docs/runbooks/ovh-production-deploy.md).
#
# Built on the VPS by `docker compose build ethniafrica`, never on a GitHub runner:
# the build needs the production environment file, and keeping it on the host means
# the deploy workflow only ever holds an SSH key.

# ── deps ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# `npm ci` runs the root `prepare` script, and husky exits non-zero outside a git
# work tree. HUSKY=0 is husky's own opt-out and is the only reason this is here.
ENV HUSKY=0

COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The build reads its configuration from a secret mounted as `.env.production.local`,
# which `next build` loads at the highest precedence. A secret mount rather than
# build args because the variable list is long and moves (fifteen NEXT_PUBLIC_* keys
# at last count, plus SENTRY_AUTH_TOKEN); an enumerated ARG list would drift out of
# date silently, and the failure mode — a variable quietly empty in the client
# bundle — is invisible until a reader hits the page. The file never lands in a
# layer, so the Sentry token does not ship inside the image.
RUN --mount=type=secret,id=build_env,target=/app/.env.production.local \
    npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: "standalone"` (next.config.ts) emits a self-contained server plus only the
# traced subset of node_modules. `.next/static` and `public/` are deliberately outside
# that bundle and have to be placed by hand — Next serves them from disk, and without
# these two lines the site renders unstyled with every image 404ing.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Traefik decides the container is healthy from this, so a failing build no longer
# silently takes over the router.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/fr').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
