import { Queue } from "bullmq";
import env from "../utils/env.util.js";

export const connection = {
  port: env.REDIS_PORT,
  host: env.REDIS_HOST,
};

const runQueue = new Queue("run_queue", { connection });
const submissionQueue = new Queue("submission_queue", { connection });

export { runQueue, submissionQueue };
