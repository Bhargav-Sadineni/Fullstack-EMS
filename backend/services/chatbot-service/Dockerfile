FROM node:22-alpine
WORKDIR /app
COPY services/chatbot-service/package*.json ./
RUN npm install --omit=dev
COPY services/chatbot-service/ ./
EXPOSE 4006
CMD ["node", "server.js"]
