import { Router } from "express";
import {
  createChecker,
  fetchChecker,
  getLatestChecker,
} from "../controllers/checker.controller.js";

const router = Router({
  mergeParams: true,
});

router.route("/").post(createChecker).get(fetchChecker);
router.route("/latest").get(getLatestChecker);

export default router;
