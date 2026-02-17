# Stage 1: Build frontend only
FROM node:20-slim AS frontend-builder
WORKDIR /workspace
COPY package.json ./
COPY frontend/package*.json frontend/
COPY frontend/ frontend/
COPY images_logo_banner_mascot/ images_logo_banner_mascot/
RUN cd frontend && npm ci && npm run build

# Stage 2: Backend + serve frontend dist (smaller image, no dev deps from frontend)
FROM node:20-slim
WORKDIR /workspace
COPY wankr-backend/package*.json wankr-backend/
RUN cd wankr-backend && npm install --omit=dev
COPY wankr-backend/ wankr-backend/
COPY --from=frontend-builder /workspace/frontend/dist frontend/dist
COPY static/ static/
COPY images_logo_banner_mascot/ images_logo_banner_mascot/

WORKDIR /workspace/wankr-backend
EXPOSE 5000
CMD ["node", "server.js"]
