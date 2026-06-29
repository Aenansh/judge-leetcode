import { Router } from "express";
import {
  fetchQuestionSubmission,
  fetchSubmissionById,
  fetchUserSubmission,
} from "../controllers/submission.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);

router.route("/").get(fetchUserSubmission);
router.route("/question/:questionId").get(fetchQuestionSubmission);
router.route("/:submissionId").get(fetchSubmissionById);

export default router;
