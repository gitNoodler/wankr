# Stage 1: Build frontend-v2
FROM node:22-slim AS frontend-builder
WORKDIR /workspace
COPY frontend-v2/package*.json frontend-v2/
COPY frontend-v2/ frontend-v2/
RUN cd frontend-v2 && npm ci && npm run build

# Stage 2: Backend + serve frontend dist (smaller image, no dev deps from frontend)
FROM node:22-slim
WORKDIR /workspace
COPY wankr-backend/package*.json wankr-backend/
RUN cd wankr-backend && npm install --omit=dev
COPY wankr-backend/ wankr-backend/
COPY --from=frontend-builder /workspace/frontend-v2/dist frontend-v2/dist
COPY static/ static/

WORKDIR /workspace/wankr-backend
EXPOSE 5000
CMD ["node", "server.js"]
