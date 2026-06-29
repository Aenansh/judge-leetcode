import { runQueue, submissionQueue } from "../bullmq/producer.js";
import prisma from "../config/db.config.js";
import crypto from "crypto";
import redis from "../config/redis.config.js";

const createSubmission = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { code, language } = req.body;
    const userId = req.user.id;

    if (
      [questionId, userId, code, language].some(
        (e) => typeof e !== "string" || !e.trim(),
      )
    ) {
      return res.status(400).json({ error: "No question ID provided." });
    }

    const formattedLanguage = language.trim().toUpperCase();

    const newSubmission = await prisma.submission.create({
      data: {
        code,
        language: formattedLanguage,
        userId,
        questionId,
        result: "PENDING",
      },
    });

    submissionQueue.add(
      "code_to_submit",
      {
        userId,
        questionId,
        code,
        language: formattedLanguage,
        submissionId: newSubmission.id,
      },
      {
        attempts: 2,
        jobId: newSubmission.id,
        removeOnComplete: true,
        removeOnFail: { count: 100 },
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    return res.status(201).json({
      message: "Submission received and queued for execution.",
      submissionId: newSubmission.id,
      status: "PENDING",
    });
  } catch (error) {
    console.log("Error in making submissions.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchUserSubmission = async (req, res) => {
  try {
    const userId = req.user.id;

    if (typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ error: "No user ID provided." });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        result: true,
        createdAt: true,
        question: {
          select: {
            title: true,
            id: true,
            number: true,
            slug: true,
          },
        },
      },
    });

    return res.status(200).json(submissions);
  } catch (error) {
    console.log("Error in fetching user submissions.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchQuestionSubmission = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    if ([questionId, userId].some((e) => typeof e !== "string" || !e.trim())) {
      return res.status(400).json({ error: "No question ID provided." });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        questionId,
        userId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        result: true,
        timeTaken: true,
        createdAt: true,
        memoryUsed: true,
      },
    });

    return res.status(200).json(submissions);
  } catch (error) {
    console.log("Error in fetching question submissions.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    if (typeof submissionId !== "string" || !submissionId.trim()) {
      return res.status(400).json({ error: "No user ID provided." });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        code: true,
        language: true,
        timeTaken: true,
        memoryUsed: true,
        testcasesPassed: true,
        totalTestcases: true,
        createdAt: true,
        errorLog: true,
        result: true,
        userId: true,
      },
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    const isOwner = submission.userId === userId;
    const isSuccessful = submission.result === "SUCCESS";

    if (!isOwner && !isSuccessful) {
      return res.status(403).json({
        error:
          "You can only view other users' code if they successfully solved the problem.",
      });
    }

    delete submission.userId;
    return res.status(200).json(submission);
  } catch (error) {
    console.log("Error in fetching submission by ID.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const runCode = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({
        error: "User not authenticated, log in before submitting code.",
      });
    }

    const { questionId } = req.params;
    const { code, language, customInput } = req.body;

    if (
      [questionId, code, language].some(
        (e) => typeof e !== "string" || !e.trim(),
      )
    ) {
      return res
        .status(400)
        .json({ error: "No question ID or language provided." });
    }

    const formattedLanguage = language.trim().toUpperCase();
    const runId = crypto.randomUUID();

    const initialState = JSON.stringify({ status: "PENDING" });
    await redis.set(`run:${runId}`, initialState, "EX", 300);

    runQueue.add(
      "code_to_run",
      {
        code,
        runId,
        language: formattedLanguage,
        userId,
        questionId,
        customInput,
      },
      {
        jobId: runId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    return res.status(202).json({
      message: "Code queued for test run.",
      runId: runId,
      status: "PENDING",
    });
  } catch (error) {
    console.log("Error in running code.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export {
  createSubmission,
  fetchUserSubmission,
  fetchQuestionSubmission,
  fetchSubmissionById,
  runCode,
};
