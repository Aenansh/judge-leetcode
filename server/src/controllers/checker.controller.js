import prisma from "../config/db.config.js";

const createChecker = async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      scriptSource,
      language = "JAVASCRIPT",
      timeoutMs = 2000,
    } = req.body;

    if (
      !scriptSource ||
      typeof scriptSource !== "string" ||
      !scriptSource.trim()
    ) {
      return res.status(400).json({ error: "scriptSource is required" });
    }

    if (!scriptSource.includes("function check")) {
      return res.status(400).json({
        error:
          "scriptSource must define a `function check(input, userOutput, referenceOutput)`",
      });
    }
    if (timeoutMs > 5000) {
      return res.status(400).json({ error: "timeoutMs cannot exceed 5000ms" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const latest = await prisma.customChecker.findFirst({
      where: { questionId },
      orderBy: { version: "desc" },
    });
    const nextVersion = latest ? latest.version + 1 : 1;

    const [checker] = await prisma.$transaction([
      prisma.customChecker.create({
        data: {
          questionId,
          scriptSource,
          language,
          timeoutMs,
          version: nextVersion,
        },
      }),
      prisma.question.update({
        where: { id: questionId },
        data: { judgeType: "SPECIAL_JUDGE" },
      }),
    ]);

    return res.status(201).json({ checker });
  } catch (error) {
    console.error("createChecker error:", error);
    return res.status(500).json({ error: "Failed to create checker" });
  }
};

const fetchChecker = async (req, res) => {
  try {
    const { questionId } = req.params;

    const checkers = await prisma.customChecker.findMany({
      where: { questionId },
      orderBy: { version: "desc" },
    });
    return res.status(200).json({ checkers });
  } catch (error) {
    console.error("getCheckers error:", error);
    return res.status(500).json({ error: "Failed to fetch checkers" });
  }
};

const getLatestChecker = async (req, res) => {
  const { questionId } = req.params;

  try {
    const checker = await prisma.customChecker.findFirst({
      where: { questionId },
      orderBy: { version: "desc" },
    });

    if (!checker) {
      return res
        .status(404)
        .json({ error: "No checker found for this problem" });
    }

    return res.status(200).json({ checker });
  } catch (err) {
    console.error("getLatestChecker error:", err);
    return res.status(500).json({ error: "Failed to fetch latest checker" });
  }
};

export { createChecker, fetchChecker, getLatestChecker };
