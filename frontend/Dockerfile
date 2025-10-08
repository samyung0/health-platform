# Frontend Dockerfile for Vite + React (Monorepo)
FROM public.ecr.aws/w0g4q7i6/bun:1.2.16-alpine AS base

# Build arguments
ARG NODE_ENV=production

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

# Copy the entire workspace (needed for backend files referenced by frontend)
COPY . .

# Build frontend (this will have access to backend files via the alias)
WORKDIR /app/frontend
RUN if [ "$NODE_ENV" = "production" ]; then \
      bun run build; \
    fi

# Development stage
FROM base AS development
WORKDIR /app

# Copy all dependencies (Bun workspaces use single node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy the entire workspace
COPY . .

# Set working directory to frontend
WORKDIR /app/frontend

EXPOSE 5173

CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Production stage with nginx
FROM public.ecr.aws/docker/library/nginx:alpine AS production
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Remove default nginx configuration to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Default to production
FROM production
