import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import employeeRoutes from "./routes/employeeRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;
const MONGODB_URI = process.env.EMPLOYEE_MONGODB_URI || process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());
app.use(multer().none());

// Correlation ID & Logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || "no-correlation-id";
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Middleware to extract verified user passed from Gateway
const extractGatewayUser = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const role = req.headers["x-user-role"];
  const email = req.headers["x-user-email"];

  if (userId) {
    req.session = { userId, role, email };
  }
  next();
};

app.use(extractGatewayUser);

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "employee-service",
    status: "healthy",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Mount Routes
app.use("/api/employees", employeeRoutes);
app.use("/api/profile", profileRoutes);

// Database connection & startup
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log(" Employee Service connected to MongoDB"))
    .catch((err) => console.error(" Employee Service MongoDB error:", err));
}

app.listen(PORT, () => {
  console.log(`🚀 [Employee Service] running on port ${PORT}`);
});
