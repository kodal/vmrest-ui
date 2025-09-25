# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for better caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .

# Accept VMREST_URL (e.g. "host.docker.internal:8697" or "http://10.0.0.5:8697")
ARG VMREST_URL
ENV VITE_VMREST_URL=${VMREST_URL}

RUN npm run build

# Serve stage
FROM nginx:alpine AS serve

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime config generation
COPY public/config.js /docker-entrypoint.d/10-config.sh
RUN sed -i '1i#!/bin/sh' /docker-entrypoint.d/10-config.sh \
  && echo "echo \"window.__APP_CONFIG__={VMREST_URL:'\${VMREST_URL:-}'}\" > /usr/share/nginx/html/config.js" >> /docker-entrypoint.d/10-config.sh \
  && chmod +x /docker-entrypoint.d/10-config.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]



