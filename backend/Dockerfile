# Backend Dockerfile for Bun (Monorepo)
FROM public.ecr.aws/w0g4q7i6/bun:1.2.16-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json and workspace files
COPY package.json bun.lockb ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY scripts/ ./scripts/

# Install dependencies for the entire workspace
RUN bun install

# Build the application
FROM base AS builder
WORKDIR /app

# Copy all dependencies (Bun workspaces use single node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy the entire workspace
COPY . .

# Set working directory to backend
WORKDIR /app/backend

# Generate types and build
RUN bun run typecheck

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/backend/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/bun.lockb ./bun.lockb
COPY --from=builder /app/backend/tsconfig.json ./tsconfig.json

EXPOSE 3000

ENV PORT=3000

CMD ["bun", "run", "start"]
