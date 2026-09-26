FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

ARG RELEASE_TAG=dev
ARG RELEASE_COMMIT=unknown
LABEL org.opencontainers.image.title="superhistorian" \
      org.opencontainers.image.version=$RELEASE_TAG \
      org.opencontainers.image.revision=$RELEASE_COMMIT

USER nextjs
EXPOSE 3000
# secrets (SITE_PASSWORD, OPENROUTER_*) come from the runtime environment
CMD ["node", "server.js"]
