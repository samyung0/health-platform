# Frontend Dockerfile for Vite + React
FROM public.ecr.aws/w0g4q7i6/bun:1.2.16-alpine AS base

# Build arguments
ARG NODE_ENV=production

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Conditional build based on environment
RUN if [ "$NODE_ENV" = "production" ]; then \
      bun run build; \
    fi

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5173

CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Production stage with nginx
FROM public.ecr.aws/docker/library/nginx:alpineAS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Default to production
FROM production
