import { Router } from "express";
import {
  createTestcases,
  fetchTestcases,
} from "../controllers/testcases.controller.js";

const router = Router({ mergeParams: true });

router.route("/").post(createTestcases).get(fetchTestcases);

export default router;
