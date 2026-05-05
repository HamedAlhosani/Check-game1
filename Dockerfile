# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json  ./server/
COPY shared/package.json  ./shared/
COPY client/package.json  ./client/

RUN npm install

COPY . .

# Build client
RUN npm run build:client

# Build server — tsup bundles shared inline, keeps npm packages external
WORKDIR /app/server
RUN /app/node_modules/.bin/tsup
WORKDIR /app

# ── Stage 2: Production ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files to run a clean production install
COPY --from=builder /app/package.json       ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/client/package.json ./client/

# Install only production deps (no dev tools, smaller image)
RUN npm install --omit=dev

# Copy server bundle and client static files
COPY --from=builder /app/server/dist  ./server/dist
COPY --from=builder /app/client/dist  ./server/public

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
