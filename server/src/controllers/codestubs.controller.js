import prisma from "../config/db.config.js";

const createCodestub = async (req, res) => {
  try {
    const { userSnippet, driverCode, language } = req.body;
    const { questionId } = req.params;

    if (
      [userSnippet, driverCode, language, questionId].some(
        (e) => typeof e !== "string" || !e.trim(),
      )
    ) {
      return res.status(400).json({ error: "All fields are required!" });
    }
    const formattedLanguage = language.trim().toUpperCase();

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: "No question with such ID" });
    }

    const stub = await prisma.codestub.upsert({
      where: {
        questionId_language: {
          questionId: questionId,
          language: formattedLanguage,
        },
      },
      update: {
        userSnippet,
        driverCode,
      },
      create: {
        userSnippet,
        driverCode,
        language: formattedLanguage,
        questionId,
      },
    });

    return res.status(201).json(stub);
  } catch (error) {
    console.log("Error in creating stub.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchCodestub = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { language } = req.query;

    if (
      !questionId?.trim() ||
      typeof language !== "string" ||
      !language.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Question ID and language query are required." });
    }

    const formattedLanguage = language.trim().toUpperCase();

    const stub = await prisma.codestub.findUnique({
      where: {
        questionId_language: {
          questionId,
          language: formattedLanguage,
        },
      },
      select: {
        userSnippet: true,
        language: true,
      },
    });

    if (!stub) {
      return res
        .status(404)
        .json({ error: "Code stub not found for this language." });
    }

    return res.status(200).json(stub);
  } catch (error) {
    console.log("Error in fetching stub.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export { createCodestub, fetchCodestub };
