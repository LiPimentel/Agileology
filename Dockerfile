FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npx prisma generate
# Placeholder only so the build can load config; the real DATABASE_URL comes from the runtime env, never from the image.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
# Next's standalone server binds to $HOSTNAME, which Docker sets to the container id: it would not
# answer on 127.0.0.1 (breaking the health check). Listen on every interface of the container;
# what the outside world can reach is decided by the published port (APP_BIND in docker-compose.yml).
ENV HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# Run as the unprivileged "node" user that ships with the image, not as root: if the app were ever
# compromised the attacker would not own the container. It only needs to write the image-resize
# cache and the uploads folder.
RUN mkdir -p /app/.next/cache /app/uploads && chown -R node:node /app/.next /app/uploads
USER node
EXPOSE 3000
# Healthy = the app answers and can reach the database (see src/app/api/health/route.ts).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
