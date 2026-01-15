# ============================================================================
# BookReel - Docker Configuration
# ============================================================================
# This Dockerfile creates a production-ready container for the Next.js app
# with support for Prisma, FFmpeg, and video generation

# ============================================================================
# Stage 1: Dependencies (Production Only)
# ============================================================================
FROM node:18-slim AS deps

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only (for final runtime stage)
RUN npm ci --only=production

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:18-slim AS builder

# Install FFmpeg, OpenSSL, and other build dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application source
COPY . .

# Copy Prisma schema
COPY prisma ./prisma/

# Set dummy DATABASE_URL for build time (Prisma requires it)
# This will be overridden at runtime with the real database URL
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma Client
RUN npx prisma generate

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build Next.js application with verbose output
RUN echo "Starting Next.js build..." && \
    npm run build && \
    echo "Build completed successfully!"

# ============================================================================
# Stage 3: Runner (Production)
# ============================================================================
FROM node:18-slim AS runner

# Install FFmpeg and OpenSSL (required for Prisma and video generation)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create directories for video/media generation
RUN mkdir -p /app/public/videos /app/tmp
RUN chown -R nextjs:nodejs /app/public/videos /app/tmp

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]

