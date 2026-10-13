FROM node:22-alpine
WORKDIR /app
COPY services/payroll-service/package*.json ./
RUN npm install --omit=dev
COPY services/payroll-service/ ./
EXPOSE 4005
CMD ["node", "server.js"]
