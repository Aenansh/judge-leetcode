import slug from "slug";
import prisma from "../config/db.config.js";

const createQuestion = async (req, res) => {
  try {
    const { title, description, difficulty, category } = req.body;
    if (
      [title, description, difficulty].some(
        (e) => typeof e !== "string" || !e.trim(),
      )
    ) {
      return res.status(400).json({ error: "All fields required." });
    }

    if (!Array.isArray(category) || category.length <= 0) {
      return res
        .status(400)
        .json({ error: "Atleast one category is required." });
    }

    const slugTitle = slug(title);

    const questionExists = await prisma.question.findUnique({
      where: { slug: slugTitle },
    });

    if (questionExists) {
      return res
        .status(400)
        .json({ error: "A question like this already exists." });
    }

    const question = await prisma.question.create({
      data: {
        title,
        description,
        difficulty,
        slug: slugTitle,
        category,
      },
    });

    return res.status(201).json(question);
  } catch (error) {
    console.log("Error in creating question.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchQuestions = async (req, res) => {
  try {
    const { difficulty, category, limit = "10", page = "1" } = req.query;
    const take = parseInt(limit) || 10;
    const skip = take * (parseInt(page) - 1);

    const whereClause = {
      difficulty: difficulty ? difficulty : undefined,
      category: category ? { has: category } : undefined,
    };

    const [totalQuestions, questions] = await prisma.$transaction([
      prisma.question.count({ where: whereClause }),
      prisma.question.findMany({
        where: whereClause,
        take: take,
        skip: skip,
        orderBy: { number: "desc" },
        select: {
          id: true,
          title: true,
          difficulty: true,
          number: true,
        },
      }),
    ]);

    return res.status(200).json({
      data: questions,
      total: totalQuestions,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(totalQuestions / take),
    });
  } catch (error) {
    console.log("Error in fetching question.", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export { createQuestion, fetchQuestions };
