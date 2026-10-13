import { initEventBus, publishEvent, subscribeEvent, getDLQStats } from "../services/shared/events.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check root .env first, then local .env
const rootEnv = path.resolve(__dirname, "../../.env");
const localEnv = path.resolve(__dirname, "../.env");

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config();
}

async function testDLQ() {
  console.log("====================================================");
  console.log("   DEAD LETTER QUEUE & RETRY POLICY VERIFICATION    ");
  console.log("====================================================");

  await initEventBus("dlq-test-worker");

  let attemptCount = 0;
  const testRoutingKey = "test.failing_event";

  await subscribeEvent(
    "dlq-test-worker",
    testRoutingKey,
    async (payload) => {
      attemptCount++;
      console.log(`[Worker Attempt #${attemptCount}] Processing payload:`, payload.data);
      throw new Error(`Simulated transient error during attempt #${attemptCount}`);
    },
    { maxRetries: 3, initialBackoffMs: 500 }
  );

  console.log("📤 Publishing intentional failing event to trigger retries and DLQ routing...");
  await publishEvent(testRoutingKey, {
    testId: 999,
    message: "This payload will fail 3 times and move to DLQ",
  });

  console.log("⏳ Awaiting exponential backoff retries (3 attempts)...");
  await new Promise((r) => setTimeout(r, 6500));

  const stats = getDLQStats();
  console.log("\n📊 DLQ Inspection Stats:");
  console.log(JSON.stringify(stats, null, 2));

  if (stats.totalDeadLettered > 0) {
    console.log("\n✅ SUCCESS: Message successfully routed to Dead Letter Queue after max retries!");
    process.exit(0);
  } else {
    console.log("\n❌ FAILED: Message was not found in Dead Letter Queue.");
    process.exit(1);
  }
}

testDLQ().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
