import prisma from "../config/db.config.js";

const createTestcases = async (req, res) => {
  try {
    const { testcases } = req.body;
    const { questionId } = req.params;

    if (!Array.isArray(testcases) || testcases.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide a valid array of testcases." });
    }

    const isValid = testcases.every(
      (tc) =>
        typeof tc.input === "string" &&
        tc.input.trim() !== "" &&
        typeof tc.expectedOutput === "string" &&
        tc.expectedOutput.trim() !== "",
    );

    if (!isValid) {
      return res.status(400).json({
        error:
          "Every testcase must include an 'input' and 'expectedOutput' string.",
      });
    }

    const questionExists = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!questionExists) {
      return res.status(404).json({ error: "Question not found." });
    }

    const dataToInsert = testcases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden || false,
      questionId: questionId,
    }));

    const result = await prisma.testcase.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    return res.status(201).json({
      message: `Successfully inserted ${result.count} testcases.`,
    });
  } catch (error) {
    console.log("Error in creating testcases.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchTestcases = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { internal } = req.query;

    if (!questionId?.trim()) {
      return res.status(400).json({ error: "Question ID is required." });
    }

    const whereClause = { questionId };
    if (internal !== "true") {
      whereClause.isHidden = false;
    }

    const testcases = await prisma.testcase.findMany({
      where: whereClause,
      select: {
        input: true,
        expectedOutput: true,
        id: true,
        isHidden: true,
      },
    });

    return res.status(200).json(testcases);
  } catch (error) {
    console.log("Error in fetching testcases.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export { createTestcases, fetchTestcases };
