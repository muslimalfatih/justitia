# Use official Bun image
FROM oven/bun:1.3.0 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/services/package.json ./packages/services/
COPY packages/config/package.json ./packages/config/
RUN bun install

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun install && cd apps/server && bun run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files for production install
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/services/package.json ./packages/services/
COPY packages/config/package.json ./packages/config/

# Install production dependencies
RUN bun install --production

# Copy built files and packages source
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages ./packages

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "apps/server/dist/index.mjs"]
