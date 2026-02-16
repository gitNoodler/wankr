# Railway: build and run wankr-backend
FROM node:20-alpine

WORKDIR /app

COPY wankr-backend/package*.json ./
RUN npm install --omit=dev

COPY wankr-backend/ .

EXPOSE 5000

CMD ["node", "server.js"]
