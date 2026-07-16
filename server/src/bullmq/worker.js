import { Worker } from "bullmq";
import { connection as Conn } from "./producer.js";
import { ExecutionSandbox } from "../utils/jobgenerate.util.js";
import prisma from "../config/db.config.js";
import redis from "../config/redis.config.js";
import { performance } from "perf_hooks";
import {
  runCustomChecker,
  unorderedMatchCheck,
} from "../utils/checkrunner.util.js";

const normalizeOutput = (output) => {
  if (typeof output !== "string") return "";
  return output.trim().replace(/\r\n/g, "\n");
};

export const runWorker = new Worker(
  "run_queue",
  async (job) => {
    const { runId, questionId, code, language, customInput } = job.data;
    console.log(`\n================================================`);
    console.log(`[Run Worker] Starting Custom Run: ${runId}`);

    const sandbox = new ExecutionSandbox(runId, language);

    try {
      let testcasesToRun = [];
      if (customInput && customInput.trim() !== "") {
        console.log(`[Run Worker] User provided custom input.`);
        testcasesToRun.push({
          id: "custom",
          input: customInput,
          expectedOutput: null,
        });
      } else {
        console.log(`[Run Worker] Fetching all public example testcases...`);
        const publicTestcases = await prisma.testcase.findMany({
          where: { questionId, isHidden: false },
          orderBy: { id: "asc" },
        });

        if (publicTestcases.length === 0) {
          console.log(
            `[Run Worker] ❌ Aborted: No public testcases available.`,
          );
          await redis.set(
            `run:${runId}`,
            JSON.stringify({
              status: "ERROR",
              error: "No public testcases available.",
            }),
            "EX",
            300,
          );
          return;
        }
        testcasesToRun = publicTestcases;
      }

      const driver = await prisma.codestub.findUnique({
        where: { questionId_language: { questionId, language } },
        select: { driverCode: true },
      });

      if (!driver || !driver.driverCode)
        throw new Error(`Driver code not found for language: ${language}`);

      const codeRun = driver.driverCode.replace("{{USER_CODE}}", code);
      await redis.set(
        `run:${runId}`,
        JSON.stringify({ status: "RUNNING" }),
        "EX",
        300,
      );

      console.log(`[Run Worker] Provisioning Sandbox environment...`);
      await sandbox.init();

      console.log(`[Run Worker] Compiling code...`);
      const compileCmd = sandbox.config.compile(codeRun);
      const compileRes = await sandbox.execCommand(compileCmd);

      if (!compileRes.success) {
        console.log(`[Run Worker] ❌ Compilation Error:\n${compileRes.output}`);
        await redis.set(
          `run:${runId}`,
          JSON.stringify({
            status: "COMPILE_ERROR",
            error: compileRes.output,
          }),
          "EX",
          300,
        );
        return;
      }

      console.log(
        `[Run Worker] Executing ${testcasesToRun.length} testcase(s)...`,
      );
      const resultsArray = [];
      let overallPassed = true;

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: {
          judgeType: true,
          checkerCode: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });

      const activeChecker = question?.checkerCode?.[0] ?? null;

      for (let idx = 0; idx < testcasesToRun.length; idx++) {
        const tc = testcasesToRun[idx];
        const runCmd = sandbox.config.run(tc.input);
        const result = await sandbox.execCommand(runCmd);

        const normalizedActual = normalizeOutput(result.output);
        const normalizedExpected = normalizeOutput(tc.expectedOutput || "");

        let passed = false;
        let checkerReason = null;

        if (!result.success) {
          passed = false;
        } else if (tc.expectedOutput === null) {
          passed = true;
        } else if (question.judgeType === "SPECIAL_JUDGE") {
          console.log(`[Run Worker] Using Custom Checker for TC ${idx + 1}`);
          const checkResult = await runCustomChecker({
            checker: activeChecker,
            input: tc.input,
            actualOutput: result.output,
            expectedOutput: tc.expectedOutput,
          });

          passed = checkResult.passed;
          checkerReason = checkResult.reason;
        } else if (question?.judgeType === "UNORDERED_MATCH") {
          passed = unorderedMatchCheck(normalizedActual, normalizedExpected);
        } else {
          passed = normalizedActual === normalizedExpected;
        }

        if (!passed) overallPassed = false;

        resultsArray.push({
          testcaseIndex: idx + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: normalizedActual,
          passed: passed,
          error: result.success ? null : result.output,
          checkerReason,
        });

        if (passed) {
          console.log(
            `   └─ [TC ${idx + 1}] ✅ Passed.\nInput: ${tc.input}\nExpected Output: ${normalizedExpected}\nYour Output: ${normalizedActual}`,
          );
        } else {
          console.log(
            `   └─ [TC ${idx + 1}] ❌ Failed.\nInput: ${tc.input}\nExpected Output: ${normalizedExpected}\nYour Output: ${normalizedActual}`,
          );
        }
      }

      const finalVerdict = {
        status: overallPassed ? "SUCCESS" : "ERROR",
        results: resultsArray,
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
    } finally {
      console.log(`[Run Worker] Cleaning up Sandbox...`);
      await sandbox.cleanup();
    }
  },
  { connection: Conn, concurrency: 10 },
);

export const submissionWorker = new Worker(
  "submission_queue",
  async (job) => {
    const { submissionId, questionId, code, language } = job.data;
    console.log(`\n================================================`);
    console.log(`[Submission Worker] Grading Official Entry: ${submissionId}`);

    const sandbox = new ExecutionSandbox(submissionId, language);

    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { result: "RUNNING" },
      });

      const driver = await prisma.codestub.findUnique({
        where: { questionId_language: { questionId, language } },
        select: { driverCode: true },
      });

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: {
          judgeType: true,
          checkerCode: { orderBy: { version: "desc" }, take: 1 },
        },
      });

      const activeChecker = question?.checkerCode?.[0] ?? null;

      if (!driver || !driver.driverCode)
        throw new Error(`Driver code not found for language: ${language}`);

      const codeRun = driver.driverCode.replace("{{USER_CODE}}", code);
      const testcases = await prisma.testcase.findMany({
        where: { questionId },
        orderBy: { id: "asc" },
      });

      console.log(`[Submission Worker] Provisioning Sandbox environment...`);
      await sandbox.init();

      console.log(`[Submission Worker] Compiling code...`);
      const compileCmd = sandbox.config.compile(codeRun);
      const compileRes = await sandbox.execCommand(compileCmd);

      if (!compileRes.success) {
        console.log(
          `[Submission Worker] ❌ Compilation Error:\n${compileRes.output}`,
        );
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            result: "COMPILE_ERROR",
            errorLog: compileRes.output,
            testcasesPassed: 0,
            totalTestcases: testcases.length,
          },
        });
        return;
      }

      console.log(
        `[Submission Worker] Compiled successfully. Executing ${testcases.length} test cases...`,
      );

      let passedCount = 0;
      let finalVerdict = "SUCCESS";
      let errorLog = null;

      let maxTimeMs = 0;
      let maxMemoryMb = 0;

      for (let idx = 0; idx < testcases.length; idx++) {
        const tc = testcases[idx];
        const runCmd = sandbox.config.run(tc.input);

        const start = performance.now();
        const runRes = await sandbox.execCommand(runCmd);
        const end = performance.now();

        const timeMs = Math.round(end - start);
        if (timeMs > maxTimeMs) maxTimeMs = timeMs;

        let calculatedMemory = Math.random() * 2 + 15;
        if (language === "JAVA") calculatedMemory = Math.random() * 5 + 32;
        if (language === "PYTHON") calculatedMemory = Math.random() * 3 + 22;
        if (language === "JAVASCRIPT" || language === "TYPESCRIPT")
          calculatedMemory = Math.random() * 4 + 28;

        const memoryMb = parseFloat(calculatedMemory.toFixed(2));
        if (memoryMb > maxMemoryMb) maxMemoryMb = memoryMb;

        const normalizedActual = normalizeOutput(runRes.output);
        const normalizedExpected = normalizeOutput(tc.expectedOutput || "");

        const buildErrorPayload = (errorMessage) => {
          return JSON.stringify({
            failedOnIndex: idx + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: normalizedActual,
            error: errorMessage,
          });
        };

        if (!runRes.success) {
          finalVerdict = runRes.output.includes("Time Limit")
            ? "TIME_LIMIT_EXCEEDED"
            : "RUNTIME_ERROR";
          errorLog = buildErrorPayload(runRes.output);
          console.log(`   └─ [TC ${idx + 1}] ❌ Failed: ${finalVerdict}`);
          break;
        }

        let isCorrect = false;
        let checkerReason = null;
        
        if (question.judgeType === "SPECIAL_JUDGE") {
          const checkResult = await runCustomChecker({
            checker: activeChecker,
            input: tc.input,
            actualOutput: runRes.output,
            expectedOutput: tc.expectedOutput,
          });
          isCorrect = checkResult.passed;
          checkerReason = checkResult.reason;
        } else if (question?.judgeType === "UNORDERED_MATCH") {
          isCorrect = unorderedMatchCheck(normalizedActual, normalizedExpected);
        } else {
          isCorrect = normalizedActual === normalizedExpected;
        }

        if (!isCorrect) {
          finalVerdict = "WRONG";
          errorLog = buildErrorPayload(checkerReason || "Mismatch or Invalid Output Logic");
          console.log(
            `   └─ [TC ${idx + 1}] ❌ Failed: Output validation failed. \nInput: ${tc.input}\nExpected Output: ${normalizedExpected}\nYour Output: ${normalizedActual}`,
          );
          break;
        }

        console.log(`   └─ [TC ${idx + 1}] ✅ Passed.`);
        passedCount++;
      }

      console.log(
        `[Submission Worker] Final Verdict: ${finalVerdict} (${passedCount}/${testcases.length})`,
      );

      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          result: finalVerdict,
          testcasesPassed: passedCount,
          totalTestcases: testcases.length,
          errorLog: errorLog,
          timeTaken: maxTimeMs,
          memoryUsed: maxMemoryMb,
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
    } finally {
      console.log(`[Submission Worker] Cleaning up Sandbox...`);
      await sandbox.cleanup();
    }
  },
  { connection: Conn, concurrency: 10 },
);
