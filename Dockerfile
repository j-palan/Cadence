# Cadence runs its own TeX engine, so it needs a runtime that can execute a
# native binary — which rules out Vercel's serverless functions. This image is
# the deploy target for any container host (Railway, Render, Fly, Cloud Run).
#
# Two stages, because build-only dependencies (TypeScript, Tailwind, drizzle-kit)
# are ~1.2GB and pointless at runtime. Pruning them in a single stage does not
# help: layers are additive, so a later `npm prune` leaves the bytes behind.

# ---------- builder ----------
FROM node:22-slim AS builder

WORKDIR /app

# `scripts/` comes along because postinstall runs during `npm ci` and copies the
# pdf.js worker — without it the install fails at this layer.
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --include=dev --no-audit --no-fund

COPY . .

# The build needs no secrets: lib/db/index.ts uses a placeholder connection
# string during the build phase precisely so this works.
RUN npm run build

# ---------- runtime ----------
FROM node:22-slim

# Pinned deliberately: the layout limits were measured against this engine, and
# a silent upgrade could change line breaking and therefore the page budget.
ARG TECTONIC_VERSION=0.17.0

# Tectonic ships static musl binaries, so no TeX distribution is needed — the
# whole engine is ~30MB and fetches only the packages a document actually uses.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*; \
    case "$(uname -m)" in \
      x86_64)  target='x86_64-unknown-linux-musl' ;; \
      aarch64) target='aarch64-unknown-linux-musl' ;; \
      *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;; \
    esac; \
    curl -fsSL \
      "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${target}.tar.gz" \
      | tar -xz -C /usr/local/bin tectonic; \
    chmod +x /usr/local/bin/tectonic; \
    tectonic --version

WORKDIR /app

# A cache baked into the image, not /tmp: Tectonic downloads ~43MB of support
# files on its first run (~21s wall clock). Warming it at build time means no
# user ever waits for that, and a container restart does not lose it.
ENV CADENCE_TEX_CACHE=/opt/tex-cache

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY next.config.mjs ./
# lib/ is needed at runtime, not just at build: lib/templates/server.ts reads the
# .tex files from disk relative to process.cwd().
COPY lib ./lib

RUN mkdir -p "$CADENCE_TEX_CACHE" \
 && npm run tex:warm \
 && chown -R node:node "$CADENCE_TEX_CACHE" /app/.next

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

# `next start` honours $PORT; the fallback keeps local `npm start` on 3003.
CMD ["npm", "start"]
