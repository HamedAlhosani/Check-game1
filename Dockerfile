# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json  ./server/
COPY shared/package.json  ./shared/
COPY client/package.json  ./client/

RUN npm install

COPY . .

# Build client and server from root (so node_modules/.bin is on PATH)
RUN npm run build:client
RUN npm run build:server

# ── Stage 2: Production ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY client/package.json ./client/

RUN npm install --omit=dev --ignore-scripts --workspaces=false 2>/dev/null; \
    npm install --omit=dev --ignore-scripts --workspace=server || true

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./server/public

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
