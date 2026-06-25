import { Router } from "express";
import {
  createCodestub,
  fetchCodestub,
} from "../controllers/codestubs.controller.js";

const router = Router({ mergeParams: true });

router.route("/").post(createCodestub).get(fetchCodestub);

export default router;
