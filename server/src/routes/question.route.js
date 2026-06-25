import { Router } from "express";
import {
  createQuestion,
  fetchQuestions,
} from "../controllers/question.controller.js";
import testcasesRouter from "./testcases.route.js";
import codestubsRouter from "./codestubs.route.js";

const router = Router();

router.route("/").post(createQuestion).get(fetchQuestions);

router.use("/:questionId/testcases", testcasesRouter);
router.use("/:questionId/codestubs", codestubsRouter);

export default router;
