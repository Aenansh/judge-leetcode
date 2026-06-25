import submissionQueue from "../bullmq/producer.js";
import prisma from "../config/db.config.js";

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

export { createSubmission, fetchUserSubmission, fetchQuestionSubmission };
