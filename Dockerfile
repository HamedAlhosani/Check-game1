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

# Copy root node_modules (all npm packages are here via workspace hoisting)
COPY --from=builder /app/node_modules ./node_modules

# Copy server bundle
COPY --from=builder /app/server/dist  ./server/dist

# Copy client build into server/public so Express can serve it
COPY --from=builder /app/client/dist  ./server/public

# Copy package.json files (Node needs them for module resolution)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server/package.json ./server/

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
