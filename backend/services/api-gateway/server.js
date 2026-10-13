import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import axios from "axios";
import crypto from "crypto";
import dashboardRoutes from "./routes/dashboardRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Microservice URLs (configurable via environment variables or Docker DNS)
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  employee: process.env.EMPLOYEE_SERVICE_URL || "http://localhost:4002",
  attendance: process.env.ATTENDANCE_SERVICE_URL || "http://localhost:4003",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4004",
  payroll: process.env.PAYROLL_SERVICE_URL || "http://localhost:4005",
  chatbot: process.env.CHATBOT_SERVICE_URL || "http://localhost:4006",
};

app.use(cors());

// Tiered Rate Limiters
// 1. General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again after 15 minutes." },
});

// 2. Strict Authentication Rate Limiter (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
});

// 3. AI Chatbot Rate Limiter (Quota & compute protection)
const chatbotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Chatbot rate limit reached. Please wait a moment before sending another message." },
});

app.use(generalLimiter);

// Correlation ID & Distributed Tracing
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || crypto.randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Authentication verification middleware for Gateway
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const session = jwt.verify(token, JWT_SECRET);

    // Propagate authenticated identity to downstream services
    req.headers["x-user-id"] = session.userId;
    req.headers["x-user-role"] = session.role;
    req.headers["x-user-email"] = session.email;
    req.session = session;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

// Admin authorization guard
const requireAdmin = (req, res, next) => {
  if (req.headers["x-user-role"] !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Comprehensive Gateway Health Check: Checks Gateway & All Downstream Services
app.get("/health", async (req, res) => {
  const checks = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        return { service: name, status: "UP", details: response.data };
      } catch (err) {
        return { service: name, status: "DOWN", error: err.message };
      }
    })
  );

  const results = {};
  let overallHealthy = true;
  checks.forEach((c) => {
    if (c.status === "fulfilled") {
      results[c.value.service] = c.value;
      if (c.value.status === "DOWN") overallHealthy = false;
    } else {
      overallHealthy = false;
    }
  });

  return res.status(overallHealthy ? 200 : 207).json({
    gateway: "healthy",
    port: PORT,
    timestamp: new Date().toISOString(),
    services: results,
  });
});

// Root ping
app.get("/", (req, res) => {
  res.send("Fullstack-EMS API Gateway is running with Microservices Architecture.");
});

// Aggregator Pattern: /api/dashboard via modular dashboardController
app.use("/api/dashboard", verifyToken, dashboardRoutes);

// Reverse Proxy Helper with pathFilter
const createServiceProxy = (targetUrl, pathFilter) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathFilter,
    on: {
      proxyReq: (proxyReq, req) => {
        try {
          fixRequestBody(proxyReq, req);
        } catch (e) {}

        if (req.headers["x-user-id"]) {
          proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
          proxyReq.setHeader("x-user-role", req.headers["x-user-role"]);
          proxyReq.setHeader("x-user-email", req.headers["x-user-email"]);
        }
        if (req.headers["x-correlation-id"]) {
          proxyReq.setHeader("x-correlation-id", req.headers["x-correlation-id"]);
        }
      },
      error: (err, req, res) => {
        console.error(`Proxy Error for ${req.url} -> ${targetUrl}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: "Bad Gateway: Target microservice is unavailable." });
        }
      },
    },
  });
};

// Route Mapping to Microservices (Preserves full /api/... path with pathFilter)
// 1. Auth Service (login, session, change-password)
app.use("/api/auth/login", authLimiter);
app.use(createServiceProxy(SERVICES.auth, "/api/auth"));

// 2. Employee Service (Protected)
app.use("/api/employees", verifyToken);
app.use(createServiceProxy(SERVICES.employee, "/api/employees"));

app.use("/api/profile", verifyToken);
app.use(createServiceProxy(SERVICES.employee, "/api/profile"));

// 3. Attendance & Leave Service (Protected)
app.use("/api/attendance", verifyToken);
app.use(createServiceProxy(SERVICES.attendance, "/api/attendance"));

app.use("/api/leave", verifyToken);
app.use(createServiceProxy(SERVICES.attendance, "/api/leave"));

// 4. Payroll Service (Protected)
app.use("/api/payslips", verifyToken);
app.use(createServiceProxy(SERVICES.payroll, "/api/payslips"));

// 5. Chatbot Service (Protected)
app.use("/api/chatbot", verifyToken, chatbotLimiter);
app.use(createServiceProxy(SERVICES.chatbot, "/api/chatbot"));

// 6. Notification Service (Protected - DLQ & Monitoring)
app.use("/api/notifications", verifyToken);
app.use("/api/notifications", createProxyMiddleware({
  target: SERVICES.notification,
  changeOrigin: true,
  pathRewrite: { "^/api/notifications": "" },
}));

app.listen(PORT, () => {
  console.log(`🌐 [API Gateway] running on port ${PORT}`);
  console.log(`⚡ Routing table:`);
  console.log(`   /api/auth          -> ${SERVICES.auth}`);
  console.log(`   /api/employees     -> ${SERVICES.employee}`);
  console.log(`   /api/attendance    -> ${SERVICES.attendance}`);
  console.log(`   /api/leave         -> ${SERVICES.attendance}`);
  console.log(`   /api/payslips      -> ${SERVICES.payroll}`);
  console.log(`   /api/chatbot       -> ${SERVICES.chatbot}`);
  console.log(`   /api/notifications -> ${SERVICES.notification}`);
  console.log(`   /api/dashboard     -> [Gateway Aggregator]`);
});
