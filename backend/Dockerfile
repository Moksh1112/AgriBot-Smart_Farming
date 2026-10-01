# AgriBot backend - works on Render, Railway, Fly.io, Google Cloud Run, any Docker host.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

USER node
EXPOSE 5000
# The platform injects PORT; 5000 is only the local default.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- "http://127.0.0.1:${PORT:-5000}/api/health" || exit 1
CMD ["node", "src/server.js"]
