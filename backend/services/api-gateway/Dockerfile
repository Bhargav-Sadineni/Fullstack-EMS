FROM node:22-alpine
WORKDIR /app
COPY services/api-gateway/package*.json ./
RUN npm install --omit=dev
COPY services/api-gateway/ ./
EXPOSE 4000
CMD ["node", "server.js"]
