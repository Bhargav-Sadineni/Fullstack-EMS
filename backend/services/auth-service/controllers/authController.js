import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password, role_type } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (role_type === "admin" && user.role !== "ADMIN") {
      return res.status(401).json({ error: "Not authorized as admin" });
    }
    if (role_type === "employee" && user.role !== "EMPLOYEE") {
      return res.status(401).json({ error: "Not authorized as employee" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ user: payload, token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

// GET /api/auth/session
export const session = (req, res) => {
  return res.json({ user: req.session });
};

// POST /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required" });
    }

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.session.userId, { password: hashed });

    return res.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Failed to change password" });
  }
};

// POST /api/auth/internal/user
export const createUserInternal = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      role: role || "EMPLOYEE",
    });
    return res.status(201).json({
      success: true,
      user: { id: user._id.toString(), email: user.email, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Failed to create user" });
  }
};

// PUT /api/auth/internal/user/:id
export const updateUserInternal = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const update = {};
    if (email) update.email = email;
    if (role) update.role = role;
    if (password) update.password = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update user" });
  }
};

// GET /api/auth/internal/user/:id
export const getUserInternal = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("email role createdAt");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};
