# Railway: build and run wankr-backend (Debian for Infisical native bindings)
FROM node:20-slim

WORKDIR /app

COPY wankr-backend/package*.json ./
RUN npm install --omit=dev

COPY wankr-backend/ .

EXPOSE 5000

CMD ["node", "server.js"]
