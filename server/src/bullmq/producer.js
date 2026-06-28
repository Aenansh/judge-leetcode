import { Queue } from "bullmq";
import env from "../utils/env.util.js";
import IORedis from "ioredis";

const connectionOptions = env.REDIS_URL
  ? env.REDIS_URL
  : { port: env.REDIS_PORT, host: env.REDIS_HOST };

export const connection = new IORedis(connectionOptions, {
  maxRetriesPerRequest: null,
});

connection.on("connect", () =>
  console.log("[BullMQ Producer] Connected to Redis"),
);
connection.on("error", (err) =>
  console.error("[BullMQ Producer] Redis error:", err.message),
);

const runQueue = new Queue("run_queue", { connection });
const submissionQueue = new Queue("submission_queue", { connection });

export { runQueue, submissionQueue };
