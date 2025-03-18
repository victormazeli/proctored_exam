# Stage 1: Build Angular App
FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve with Caddy
FROM caddy:2.7.6-alpine

WORKDIR /srv
COPY --from=builder /app/dist/frontend /srv
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port (Caddy serves on 80 by default)
EXPOSE 80

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
