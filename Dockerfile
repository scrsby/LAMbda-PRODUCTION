# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Builder
#   Installs all dependencies and bundles the client TypeScript with webpack.
#   Server TypeScript is NOT compiled here — tsx runs it directly at runtime,
#   which keeps __dirname pointing at the source tree so static file paths work.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build client-side bundles → client/dist/
RUN npx webpack --config webpack.config.js --mode production


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Full install — tsx is a devDependency used as the production runtime
COPY package*.json ./
RUN npm ci

# Server TypeScript source + ipv4-preload.cjs
COPY --from=builder /app/server ./server

# Client bundles and static assets
COPY --from=builder /app/client/dist       ./client/dist
COPY --from=builder /app/client/src/pages  ./client/src/pages
COPY --from=builder /app/client/src/assets ./client/src/assets
COPY --from=builder /app/client/src/style  ./client/src/style
COPY --from=builder /app/client/public     ./client/public

# tsconfig required by tsx at runtime
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# --no-network-family-autoselection disables Node.js v20 Happy Eyeballs so IPv6
# (unreachable in Docker Desktop) cannot race and fail before IPv4 wins.
CMD ["sh", "-c", "exec node --no-network-family-autoselection --dns-result-order=ipv4first node_modules/.bin/tsx server/config/app.ts"]
