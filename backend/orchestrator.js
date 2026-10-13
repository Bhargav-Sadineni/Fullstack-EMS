import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials from root .env or local .env
const rootEnvPath = path.resolve(__dirname, "..", ".env");
const localEnvPath = path.join(__dirname, ".env");
let baseEnv = {};
if (fs.existsSync(rootEnvPath)) {
  baseEnv = dotenv.parse(fs.readFileSync(rootEnvPath));
  console.log(" Loaded credentials from root .env");
} else if (fs.existsSync(localEnvPath)) {
  baseEnv = dotenv.parse(fs.readFileSync(localEnvPath));
  console.log(" Loaded credentials from backend/.env");
}

const SERVICES = [
  { name: "AUTH", dir: "services/auth-service", port: 4001, color: "\x1b[35m" },
  { name: "EMPLOYEE", dir: "services/employee-service", port: 4002, color: "\x1b[36m" },
  { name: "ATTENDANCE", dir: "services/attendance-service", port: 4003, color: "\x1b[33m" },
  { name: "NOTIFICATION", dir: "services/notification-service", port: 4004, color: "\x1b[32m" },
  { name: "PAYROLL", dir: "services/payroll-service", port: 4005, color: "\x1b[34m" },
  { name: "CHATBOT", dir: "services/chatbot-service", port: 4006, color: "\x1b[95m" },
  { name: "GATEWAY", dir: "services/api-gateway", port: 4000, color: "\x1b[31m" },
];

const RESET = "\x1b[0m";
const children = [];

console.log("==================================================================");
console.log("   Fullstack-EMS Microservices Orchestrator (Local Development)   ");
console.log("==================================================================");

// Function to start a single microservice
function startService(svc) {
  const fullPath = path.join(__dirname, svc.dir);
  
  const env = {
    ...process.env,
    ...baseEnv,
    PORT: svc.port.toString(),
    AUTH_SERVICE_URL: "http://localhost:4001",
    EMPLOYEE_SERVICE_URL: "http://localhost:4002",
    ATTENDANCE_SERVICE_URL: "http://localhost:4003",
    NOTIFICATION_SERVICE_URL: "http://localhost:4004",
    PAYROLL_SERVICE_URL: "http://localhost:4005",
    CHATBOT_SERVICE_URL: "http://localhost:4006",
  };

  const child = spawn("node", ["server.js"], {
    cwd: fullPath,
    env,
    shell: true,
  });

  child.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${svc.color}[${svc.name}:${svc.port}]${RESET} ${line}`);
      }
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${svc.color}[${svc.name}:${svc.port}]${RESET} \x1b[31m${line}\x1b[0m`);
      }
    }
  });

  child.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${svc.color}[${svc.name}]${RESET} process exited with code ${code}`);
    }
  });

  children.push(child);
}

// Start all microservices in order (downstream services first, then Gateway)
SERVICES.forEach((svc) => startService(svc));

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping all microservices...");
  children.forEach((child) => child.kill("SIGINT"));
  process.exit(0);
});

process.on("SIGTERM", () => {
  children.forEach((child) => child.kill("SIGTERM"));
  process.exit(0);
});
