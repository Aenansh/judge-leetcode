import { Worker } from "bullmq";
import { connection as Conn } from "./producer.js";

const runWorker = new Worker("run_queue", async (job) => {}, {
  connection: Conn,
  concurrency: 10,
});

const submissionWorker = new Worker("submission_queue", async (job) => {}, {
  connection: Conn,
  concurrency: 10,
});
