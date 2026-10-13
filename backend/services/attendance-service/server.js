import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import { initEventBus } from "../shared/events.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;
const MONGODB_URI = process.env.ATTENDANCE_MONGODB_URI || process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// Correlation ID & Logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || "no-correlation-id";
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Middleware to extract user passed from Gateway
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
    service: "attendance-service",
    status: "healthy",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Mount Attendance and Leave Routes
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);

// Database connection & startup
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log(" Attendance Service connected to MongoDB"))
    .catch((err) => console.error(" Attendance Service MongoDB error:", err));
}

await initEventBus("attendance-service");

app.listen(PORT, () => {
  console.log(`🚀 [Attendance Service] running on port ${PORT}`);
});
