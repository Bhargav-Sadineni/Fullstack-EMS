import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authServiceDir = path.resolve(__dirname, "../services/auth-service");

console.log("🌱 Running database seeder via Auth Microservice...\n");

const child = spawn("node", ["seed.js"], {
  cwd: authServiceDir,
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ Database seeding process finished successfully.");
  } else {
    console.error(`\n❌ Seeding exited with code ${code}.`);
    process.exit(code || 1);
  }
});
