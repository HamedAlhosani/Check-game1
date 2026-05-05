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

# Build server — bundle everything into one self-contained file
RUN ./node_modules/.bin/esbuild server/src/server.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=cjs \
    --outfile=server/dist/server.js \
    --log-level=info

# ── Stage 2: Production ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app/server

COPY --from=builder /app/server/dist  ./dist
COPY --from=builder /app/client/dist  ./public

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
