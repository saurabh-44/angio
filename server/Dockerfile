# Environ API server. Node 20 (Alpine). All deps are pure-JS (bcryptjs,
# pdfkit, xlsx, qrcode, etc.) so no native build toolchain is needed.
FROM node:20-alpine

WORKDIR /app

# Install deps first for layer caching. Only production deps.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source.
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
