import { Router } from "express";
import {
  fetchQuestionSubmission,
  fetchUserSubmission,
} from "../controllers/submission.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);

router.route("/").get(fetchUserSubmission);
router.route("/:questionId").get(fetchQuestionSubmission);

export default router;
