import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check root .env first, then backend .env, then local service .env
const rootEnvPath = path.resolve(__dirname, "../../../.env");
const backendEnvPath = path.resolve(__dirname, "../../.env");
const localEnvPath = path.resolve(__dirname, ".env");

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

const TemporaryPassword = "admin123";

async function registerAdmin() {
  try {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sadinenibhargav0@gmail.com";
    const MONGODB_URI = process.env.AUTH_MONGODB_URI || process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      console.error("❌ Missing MONGODB_URI env variable in root .env");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("🔗 Auth Service connected to MongoDB for database seeding...");

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log(`✅ Admin user already exists with email: ${existingAdmin.email} (Role: ${existingAdmin.role})`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(TemporaryPassword, 10);
    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
    });

    console.log("🎉 Initial Admin account successfully seeded!");
    console.log(`📧 Email:    ${admin.email}`);
    console.log(`🔑 Password: ${TemporaryPassword}`);
    console.log("⚠️ Please change the default password after first login.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
    process.exit(1);
  }
}

registerAdmin();
