import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatbotRoutes from "./routes/chatbotRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4006;

app.use(cors());
app.use(express.json());

// Correlation ID & Logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || "no-correlation-id";
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// User session extraction from Gateway
app.use((req, res, next) => {
  const userId = req.headers["x-user-id"];
  const role = req.headers["x-user-role"];
  const email = req.headers["x-user-email"];
  if (userId) {
    req.session = { userId, role, email };
  }
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "chatbot-service",
    status: "healthy",
    uptime: process.uptime(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Mount Chatbot Routes
app.use("/api/chatbot", chatbotRoutes);

app.listen(PORT, () => {
  console.log(`🚀 [Chatbot Service] running on port ${PORT}`);
});
