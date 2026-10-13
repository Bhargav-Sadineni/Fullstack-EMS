import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;
const MONGODB_URI = process.env.AUTH_MONGODB_URI || process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// Correlation ID & Logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || "no-correlation-id";
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "auth-service",
    status: "healthy",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Mount Auth Routes
app.use("/api/auth", authRoutes);

// Database connection & startup
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log(" Auth Service connected to MongoDB"))
    .catch((err) => console.error(" Auth Service MongoDB error:", err));
}

app.listen(PORT, () => {
  console.log(`🚀 [Auth Service] running on port ${PORT}`);
});
