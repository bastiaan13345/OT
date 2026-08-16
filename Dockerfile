FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS production-dependencies
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate

FROM base AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends age ca-certificates dumb-init ffmpeg openssl sqlite3 util-linux \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next-build/standalone ./
COPY --from=builder /app/.next-build/static ./.next-build/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY package.json ./package.json
COPY scripts/backup-data.sh scripts/docker-entrypoint.sh scripts/provision-user.mjs scripts/restore-data.sh scripts/validate-production-env.mjs ./scripts/

RUN mkdir -p /data/media .next-build/cache \
  && chown -R node:node /data /app/node_modules .next-build/cache \
  && chmod 0555 scripts/backup-data.sh scripts/docker-entrypoint.sh scripts/restore-data.sh

USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--", "./scripts/docker-entrypoint.sh"]
