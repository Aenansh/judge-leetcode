import { Router } from "express";
import { createQuestion, fetchQuestions } from "../controllers/question.controller";

const router = Router();

router.route("/").post(createQuestion).get(fetchQuestions);

export default router;