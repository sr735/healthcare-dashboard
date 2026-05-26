# ── Development stage (hot reload via Vite dev server) ───────────────────────
# Used by docker-compose.dev.yml.  The source tree is mounted as a volume so
# edits on the host are immediately reflected inside the container.
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Source is mounted at runtime — no COPY needed here.
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
# Use npm install if no lockfile exists (first build), otherwise npm ci for reproducibility
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Build-time env (VITE_ vars must be available at build time)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
