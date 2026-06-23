# Build the React SPA, then serve the static dist with Caddy (SPA fallback
# to index.html so client-side routes like /tree/:code work). The edge
# Caddy reverse-proxies app.<domain> -> web:80.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Baked into the bundle at build time — the absolute API origin the
# browser calls (cross-subdomain to the API, with CORS + cookies).
# Written to .env.production so Vite reliably picks it up (.env.production
# is .dockerignore'd from the COPY, so this is the only one in the image).
ARG VITE_API_BASE_URL
RUN echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" > .env.production
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
RUN printf ':80 {\n\troot * /srv\n\ttry_files {path} /index.html\n\tfile_server\n\tencode gzip\n}\n' > /etc/caddy/Caddyfile
