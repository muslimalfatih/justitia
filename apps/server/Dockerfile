# Use official Bun image
FROM oven/bun:1.3.0 AS base
WORKDIR /app

# Build stage - install deps and build in one stage
FROM base AS builder

# Copy everything
COPY . .

# Install all dependencies and build
RUN bun install && cd apps/server && bun run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules from builder (includes all deps)
COPY --from=builder /app/node_modules ./node_modules

# Copy built server
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy package.json for bun to resolve workspace
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "apps/server/dist/index.mjs"]
