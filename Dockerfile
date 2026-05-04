# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json  ./server/
COPY shared/package.json  ./shared/
COPY client/package.json  ./client/

RUN npm install

COPY . .

# Build client → client/dist/
RUN npm run build:client

# Build server → server/dist/server.js  (tsup bundles shared inline)
WORKDIR /app/server
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app/server

COPY server/package.json ./
RUN npm install --omit=dev --ignore-scripts

# Server bundle
COPY --from=builder /app/server/dist ./dist

# Client static files (Express serves these as /public)
COPY --from=builder /app/client/dist ./public

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
