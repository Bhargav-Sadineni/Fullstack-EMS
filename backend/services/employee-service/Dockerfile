FROM node:22-alpine
WORKDIR /app
COPY services/employee-service/package*.json ./
RUN npm install --omit=dev
COPY services/shared/ ../shared/
COPY services/employee-service/ ./
EXPOSE 4002
CMD ["node", "server.js"]
