# Stage 1: Build frontend only
FROM node:20-slim AS frontend-builder
WORKDIR /workspace
COPY package.json ./
COPY frontend-v2/package*.json frontend-v2/
COPY frontend-v2/ frontend-v2/
COPY images_logo_banner_mascot/ images_logo_banner_mascot/
RUN cd frontend-v2 && npm ci && npm run build

# Stage 2: Backend + serve frontend dist (smaller image, no dev deps from frontend)
# Requires static/ and images_logo_banner_mascot/ in build context (repo root).
FROM node:20-slim
WORKDIR /workspace
COPY wankr-backend/package*.json wankr-backend/
RUN cd wankr-backend && npm install --omit=dev
COPY wankr-backend/ wankr-backend/
COPY --from=frontend-builder /workspace/frontend-v2/dist frontend-v2/dist
COPY static/ static/
COPY images_logo_banner_mascot/ images_logo_banner_mascot/

WORKDIR /workspace/wankr-backend
EXPOSE 5000
CMD ["node", "server.js"]
