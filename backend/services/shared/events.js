import EventEmitter from "events";
import amqp from "amqplib";

const localBus = new EventEmitter();
localBus.setMaxListeners(50);

let amqpConnection = null;
let amqpChannel = null;
let isRabbitConnected = false;

// RabbitMQ Exchange & DLQ Configuration
const EXCHANGE_NAME = "ems_events_exchange";
const DLX_EXCHANGE_NAME = "ems_dlx_exchange";
const DLQ_QUEUE_NAME = "ems_dead_letter_queue";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;

// Diagnostics: In-memory DLQ audit log
const inMemoryDLQ = [];

function recordDLQMessage(record) {
  const entry = {
    id: `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...record,
    timestamp: new Date().toISOString(),
  };
  inMemoryDLQ.unshift(entry);
  if (inMemoryDLQ.length > 100) {
    inMemoryDLQ.pop();
  }
  return entry;
}

export async function initEventBus(serviceName = "service") {
  const rabbitUri = process.env.RABBITMQ_URI;

  if (rabbitUri) {
    try {
      amqpConnection = await amqp.connect(rabbitUri);
      amqpChannel = await amqpConnection.createChannel();

      // 1. Assert Primary Topic Exchange
      await amqpChannel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

      // 2. Assert Dead Letter Exchange (DLX) & Dead Letter Queue (DLQ)
      await amqpChannel.assertExchange(DLX_EXCHANGE_NAME, "topic", { durable: true });
      const dlq = await amqpChannel.assertQueue(DLQ_QUEUE_NAME, { durable: true });
      await amqpChannel.bindQueue(dlq.queue, DLX_EXCHANGE_NAME, "#");

      isRabbitConnected = true;
      console.log(`[${serviceName}] Connected to RabbitMQ Message Broker (DLX: ${DLX_EXCHANGE_NAME}, DLQ: ${DLQ_QUEUE_NAME})`);

      amqpConnection.on("error", (err) => {
        console.warn(`[${serviceName}] RabbitMQ error:`, err.message);
        isRabbitConnected = false;
      });
      amqpConnection.on("close", () => {
        isRabbitConnected = false;
      });
    } catch (err) {
      console.warn(`[${serviceName}] RabbitMQ unavailable (${err.message}). Using distributed in-process event bus with DLQ.`);
      isRabbitConnected = false;
    }
  } else {
    console.log(`[${serviceName}] Using in-process event queue with DLQ support.`);
  }
}

export async function publishEvent(routingKey, data) {
  const payload = {
    event: routingKey,
    data,
    timestamp: new Date().toISOString(),
  };

  // 1. If RabbitMQ is connected, publish persistent message to topic exchange
  if (isRabbitConnected && amqpChannel) {
    try {
      amqpChannel.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );
      return;
    } catch (err) {
      console.warn("Failed to publish to RabbitMQ, using local bus:", err.message);
    }
  }

  // 2. Fallback to in-process bus
  localBus.emit(routingKey, payload);
}

export async function subscribeEvent(serviceName, routingKeyPattern, handler, options = {}) {
  const maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
  const initialBackoffMs = options.initialBackoffMs || DEFAULT_INITIAL_BACKOFF_MS;

  // If RabbitMQ connected, create durable worker queue with DLQ binding
  if (isRabbitConnected && amqpChannel) {
    try {
      const safeKey = routingKeyPattern.replace(/[^a-zA-Z0-9_-]/g, "_");
      const queueName = `${serviceName}_${safeKey}`;

      const q = await amqpChannel.assertQueue(queueName, {
        durable: true,
      });
      await amqpChannel.bindQueue(q.queue, EXCHANGE_NAME, routingKeyPattern);

      amqpChannel.consume(q.queue, async (msg) => {
        if (!msg) return;

        let content;
        try {
          content = JSON.parse(msg.content.toString());
        } catch (parseErr) {
          console.error(`🚨 [${serviceName}] Malformed event JSON. Moving immediately to DLQ.`);
          recordDLQMessage({
            routingKey: routingKeyPattern,
            service: serviceName,
            payload: msg.content.toString(),
            error: `JSON parse error: ${parseErr.message}`,
            retryCount: 0,
            fatal: true,
          });
          amqpChannel.ack(msg);
          return;
        }

        const headers = msg.properties.headers || {};
        const currentRetry = headers["x-retry-count"] || 0;

        try {
          await handler(content);
          amqpChannel.ack(msg);
        } catch (err) {
          if (currentRetry < maxRetries) {
            const nextRetry = currentRetry + 1;
            const delayMs = Math.min(initialBackoffMs * Math.pow(2, currentRetry), 15000);

            console.warn(
              `⚠️ [${serviceName}] Transient failure on '${routingKeyPattern}'. Retry ${nextRetry}/${maxRetries} in ${delayMs}ms. Reason: ${err.message}`
            );

            // Wait exponential backoff delay before re-queueing
            await new Promise((resolve) => setTimeout(resolve, delayMs));

            // Re-publish to the worker queue with incremented retry headers
            amqpChannel.sendToQueue(q.queue, msg.content, {
              persistent: true,
              headers: {
                ...headers,
                "x-retry-count": nextRetry,
                "x-last-error": err.message,
                "x-failed-at": new Date().toISOString(),
                "x-original-service": serviceName,
              },
            });
            amqpChannel.ack(msg);
          } else {
            // Max retries exceeded -> Route to Dead Letter Queue (DLQ)
            console.error(
              `🚨 [${serviceName}] EXCEEDED MAX RETRIES (${maxRetries}) on '${routingKeyPattern}'. Moving event to DLQ [${DLQ_QUEUE_NAME}]. Fatal Error: ${err.message}`
            );

            recordDLQMessage({
              routingKey: routingKeyPattern,
              service: serviceName,
              payload: content,
              error: err.message,
              retryCount: currentRetry,
              fatal: true,
            });

            // Publish message to Dead Letter Exchange
            amqpChannel.publish(
              DLX_EXCHANGE_NAME,
              `dlq.${serviceName}.${safeKey}`,
              msg.content,
              {
                persistent: true,
                headers: {
                  ...headers,
                  "x-retry-count": currentRetry,
                  "x-fatal-error": err.message,
                  "x-failed-service": serviceName,
                  "x-routing-key": routingKeyPattern,
                  "x-moved-to-dlq-at": new Date().toISOString(),
                },
              }
            );
            amqpChannel.ack(msg);
          }
        }
      });
      return;
    } catch (err) {
      console.warn("RabbitMQ subscription failed, falling back to local bus:", err.message);
    }
  }

  // In-process fallback with DLQ and Exponential Backoff
  localBus.on(routingKeyPattern, async (payload) => {
    let retry = 0;
    while (retry <= maxRetries) {
      try {
        await handler(payload);
        return;
      } catch (err) {
        if (retry < maxRetries) {
          retry++;
          const delayMs = Math.min(initialBackoffMs * Math.pow(2, retry - 1), 15000);
          console.warn(`⚠️ [${serviceName}] Local bus retry ${retry}/${maxRetries} for '${routingKeyPattern}' in ${delayMs}ms. Reason: ${err.message}`);
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          console.error(`🚨 [${serviceName}] Local bus DLQ alert: Event '${routingKeyPattern}' exceeded max retries (${maxRetries}).`);
          recordDLQMessage({
            routingKey: routingKeyPattern,
            service: serviceName,
            payload,
            error: err.message,
            retryCount: retry,
            fatal: true,
          });
          break;
        }
      }
    }
  });
}

// Diagnostics & DLQ Inspection API
export function getDLQStats() {
  return {
    totalDeadLettered: inMemoryDLQ.length,
    dlxExchange: DLX_EXCHANGE_NAME,
    dlqQueue: DLQ_QUEUE_NAME,
    maxRetriesConfigured: DEFAULT_MAX_RETRIES,
    recentFailures: inMemoryDLQ.slice(0, 10),
  };
}

export async function replayDLQMessage(dlqId) {
  const item = inMemoryDLQ.find((m) => m.id === dlqId);
  if (!item) {
    throw new Error(`DLQ message ${dlqId} not found`);
  }
  console.log(`🔄 Replaying DLQ message ${dlqId} on '${item.routingKey}'...`);
  await publishEvent(item.routingKey, item.payload.data || item.payload);
  return { success: true, replayedId: dlqId, routingKey: item.routingKey };
}
