# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Builder
#   Installs all dependencies (including devDependencies), compiles the
#   server TypeScript with tsc, and bundles the client TypeScript with webpack.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy the full source tree
COPY . .

# Build client-side bundles → client/dist/
RUN npx webpack --config webpack.config.js --mode production

# Compile server TypeScript → dist/
RUN npx tsc --project tsconfig.json


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Production image
#   Copies only the compiled output and production dependencies to keep the
#   final image as small as possible.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled server code
COPY --from=builder /app/dist ./dist

# Client bundles (served from /dist in the browser via express.static)
COPY --from=builder /app/client/dist ./client/dist

# Static client assets served by Express
COPY --from=builder /app/client/src/pages  ./client/src/pages
COPY --from=builder /app/client/src/assets ./client/src/assets
COPY --from=builder /app/client/src/style  ./client/src/style
COPY --from=builder /app/client/public     ./client/public

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run the compiled server entry point
CMD ["node", "dist/server/config/app.js"]
