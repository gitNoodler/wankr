# Stage 1: Build frontend-v2
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /workspace
COPY frontend-v2/package*.json frontend-v2/
RUN npm ci --prefix frontend-v2
COPY frontend-v2/ frontend-v2/
ARG VITE_WALLETCONNECT_PROJECT_ID=0df1ebc0fd718c15627764d95c6b63a4
ENV VITE_WALLETCONNECT_PROJECT_ID=$VITE_WALLETCONNECT_PROJECT_ID
RUN cd frontend-v2 && npm run build

# Stage 2: Backend + serve frontend dist (smaller image, no dev deps from frontend)
FROM node:22-bookworm-slim
WORKDIR /workspace
COPY wankr-backend/package*.json wankr-backend/
RUN cd wankr-backend && npm install --omit=dev
COPY wankr-backend/ wankr-backend/
COPY --from=frontend-builder /workspace/frontend-v2/dist frontend-v2/dist
COPY static/ static/

WORKDIR /workspace/wankr-backend
EXPOSE 5000
CMD ["node", "server.js"]
