FROM node:22-alpine
WORKDIR /app
COPY services/auth-service/package*.json ./
RUN npm install --omit=dev
COPY services/auth-service/ ./
EXPOSE 4001
CMD ["node", "server.js"]
