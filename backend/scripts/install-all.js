import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const directories = [
  ".",
  "services/shared",
  "services/api-gateway",
  "services/auth-service",
  "services/employee-service",
  "services/attendance-service",
  "services/notification-service",
  "services/payroll-service",
  "services/chatbot-service",
];

console.log("📦 Installing dependencies across all microservices...\n");

for (const dir of directories) {
  const fullPath = path.join(rootDir, dir);
  console.log(`➡️ Installing in ${dir}...`);
  try {
    execSync("npm install", { cwd: fullPath, stdio: "inherit" });
  } catch (err) {
    console.error(`❌ Failed to install in ${dir}:`, err.message);
  }
}

console.log("\n✅ All microservice dependencies successfully installed!");
