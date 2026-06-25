import { Router } from "express";
import {
  fetchQuestionSubmission,
  fetchUserSubmission,
} from "../controllers/submission.controller.js";

const router = Router();

router.route("/").get(fetchUserSubmission);
router.route("/:questionId").get(fetchQuestionSubmission);

export default router;
