FROM node:22-alpine
WORKDIR /app
COPY services/attendance-service/package*.json ./
RUN npm install --omit=dev
COPY services/shared/ ../shared/
COPY services/attendance-service/ ./
EXPOSE 4003
CMD ["node", "server.js"]
