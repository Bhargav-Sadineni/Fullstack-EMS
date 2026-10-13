import express from "express";
import jwt from "jsonwebtoken";
import {
  login,
  session,
  changePassword,
  createUserInternal,
  updateUserInternal,
  getUserInternal,
} from "../controllers/authController.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Middleware for token validation inside auth service
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const userSession = jwt.verify(token, JWT_SECRET);
    req.session = userSession;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Public Routes
router.post("/login", login);

// Protected User Routes
router.get("/session", authenticate, session);
router.post("/change-password", authenticate, changePassword);

// Internal Inter-Service RPC Endpoints
router.post("/internal/user", createUserInternal);
router.put("/internal/user/:id", updateUserInternal);
router.get("/internal/user/:id", getUserInternal);

export default router;
