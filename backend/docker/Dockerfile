# ─────────────────────────────────────────
# EcoSphere Backend — Production Dockerfile
# Multi-stage build: builder + runner
# ─────────────────────────────────────────

# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 2: Production runner ──
FROM node:20-alpine AS runner

# Security: run as non-root
RUN addgroup -S ecosphere && adduser -S ecosphere -G ecosphere

WORKDIR /app

# Copy node_modules and prisma from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma

# Copy application source
COPY src   ./src
COPY package.json ./

# Create log directory with correct permissions
RUN mkdir -p /app/logs && chown -R ecosphere:ecosphere /app

USER ecosphere

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
