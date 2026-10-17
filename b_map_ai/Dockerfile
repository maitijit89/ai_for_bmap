# ============================================================================
# Stage 1: Build TypeScript Application
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build
COPY src ./src
RUN npm run build

# ============================================================================
# Stage 2: Production Runtime
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Non-root security user
USER node

# Expose HTTP and WebSocket port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start production server
CMD ["node", "dist/index.js"]
