import { Router } from "express";
import {
  createQuestion,
  fetchQuestionById,
  fetchQuestions,
} from "../controllers/question.controller.js";
import testcasesRouter from "./testcases.route.js";
import codestubsRouter from "./codestubs.route.js";
import { createSubmission } from "../controllers/submission.controller.js";
import { rateLimitSubmission } from "../middlewares/submissionrate.middleware.js";

const router = Router();

router.route("/").post(createQuestion).get(fetchQuestions);
router.route("/:questionId").get(fetchQuestionById);
router
  .route("/:questionId/submissions")
  .post(rateLimitSubmission, createSubmission);

router.use("/:questionId/testcases", testcasesRouter);
router.use("/:questionId/codestubs", codestubsRouter);

export default router;
