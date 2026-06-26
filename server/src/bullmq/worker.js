import { Worker } from "bullmq";
import { connection as Conn } from "./producer.js";
import { executeInK8s } from "../utils/jobgenerate.util.js";
import prisma from "../config/db.config.js";
import redis from "../config/redis.config.js"

export const runWorker = new Worker(
  "run_queue",
  async (job) => {
    const { runId, questionId, code, language, customInput } = job.data;
    console.log(`[Run Worker] Processing custom run execution: ${runId}`);
    try {
      let inputToTest = customInput;
      let expectedOutput = null;

      if (!inputToTest) {
        const publicTestCase = await prisma.testcase.findFirst({
          where: { questionId, isHidden: false },
        });

        if (!publicTestCase) {
          await redis.set(
            `run:${runId}`,
            JSON.stringify({
              status: "ERROR",
              error: "No public testcase available.",
            }),
            "EX",
            300,
          );
          return;
        }
        inputToTest = publicTestCase.input;
        expectedOutput = publicTestCase.expectedOutput;
      }

      const driver = await prisma.codestub.findUnique({
        where: {
          questionId_language: {
            questionId,
            language,
          },
        },
        select: {
          driverCode: true,
        },
      });

      if (!driver || !driver.driverCode) {
        throw new Error(`Driver code not found for language: ${language}`);
      }

      const codeRun = driver.driverCode.replace("{{USER_CODE}}", code);
      await redis.set(
        `run:${runId}`,
        JSON.stringify({ status: "RUNNING" }),
        "EX",
        300,
      );

      const result = await executeInK8s(codeRun, language, inputToTest, runId);

      const finalVerdict = {
        status: result.success ? "SUCCESS" : "ERROR",
        output: result.output || null,
        error: result.error || null,
        expectedOutput: expectedOutput,
        passed:
          result.success &&
          (expectedOutput === null || result.output === expectedOutput),
      };

      await redis.set(`run:${runId}`, JSON.stringify(finalVerdict), "EX", 300);
    } catch (error) {
      console.error(`[Run Worker Fail]:`, error);
      await redis.set(
        `run:${runId}`,
        JSON.stringify({
          status: "SYSTEM_ERROR",
          error: "Internal runner crash.",
        }),
        "EX",
        300,
      );
    }
  },
  {
    connection: Conn,
    concurrency: 10,
  },
);

export const submissionWorker = new Worker(
  "submission_queue",
  async (job) => {
    const { submissionId, questionId, code, language } = job.data;
    console.log(`[Submission Worker] Grading official entry: ${submissionId}`);

    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { result: "RUNNING" },
      });

      const driver = await prisma.codestub.findUnique({
        where: {
          questionId_language: {
            questionId,
            language,
          },
        },
        select: {
          driverCode: true,
        },
      });

      if (!driver || !driver.driverCode) {
        throw new Error(`Driver code not found for language: ${language}`);
      }

      const codeRun = driver.driverCode.replace("{{USER_CODE}}", code);

      const testcases = await prisma.testcase.findMany({
        where: { questionId },
      });

      let passedCount = 0;
      let finalVerdict = "SUCCESS";
      let errorLog = null;

      for (let idx = 0; idx < testcases.length; idx++) {
        const tc = testcases[idx];

        const executionId = `${submissionId}-tc-${idx}`;
        const result = await executeInK8s(
          codeRun,
          language,
          tc.input,
          executionId,
        );

        if (!result.success) {
          finalVerdict = result.error.includes("Timeout")
            ? "TIME_LIMIT_EXCEEDED"
            : "RUNTIME_ERROR";
          errorLog = result.error;
          break;
        }

        if (result.output !== tc.expectedOutput) {
          finalVerdict = "WRONG_ANSWER";
          errorLog = `Failed on testcase ${idx + 1}.`;
          break;
        }

        passedCount++;
      }

      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          result: finalVerdict,
          testcasesPassed: passedCount,
          totalTestcases: testcases.length,
          errorLog: errorLog,
        },
      });
    } catch (error) {
      console.error(`[Submission Worker Fail]:`, error);
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          result: "SYSTEM_ERROR",
          errorLog: "Judge engine processing failure.",
        },
      });
    }
  },
  {
    connection: Conn,
    concurrency: 10,
  },
);
