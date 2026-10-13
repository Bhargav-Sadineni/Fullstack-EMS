FROM node:22-alpine
WORKDIR /app
COPY services/notification-service/package*.json ./
RUN npm install --omit=dev
COPY services/shared/ ../shared/
COPY services/notification-service/ ./
EXPOSE 4004
CMD ["node", "server.js"]
