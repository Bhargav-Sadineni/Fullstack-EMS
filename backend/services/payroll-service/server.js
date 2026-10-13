import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import payslipRoutes from "./routes/payslipRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;
const MONGODB_URI = process.env.PAYROLL_MONGODB_URI || process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// Correlation ID & Logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || "no-correlation-id";
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// User session extraction from Gateway headers
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
    service: "payroll-service",
    status: "healthy",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Mount Payslip Routes
app.use("/api/payslips", payslipRoutes);

// Database connection & startup
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log(" Payroll Service connected to MongoDB"))
    .catch((err) => console.error(" Payroll Service MongoDB error:", err));
}

app.listen(PORT, () => {
  console.log(`🚀 [Payroll Service] running on port ${PORT}`);
});
