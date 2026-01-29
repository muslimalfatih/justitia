# Use official Bun image
FROM oven/bun:1.3.0 AS base
WORKDIR /app

# Build stage - install deps and build in one stage
FROM base AS builder

# Copy everything
COPY . .

# Install all dependencies and build
RUN bun install && cd apps/server && bun run build

# Production stage - minimal image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only the built files (everything is bundled)
COPY --from=builder /app/apps/server/dist ./dist

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "dist/index.mjs"]
