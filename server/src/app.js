import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./utils/env.util.js";

const app = express();
const allowedOrigins = (
  env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    allowedHeaders: true,
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  }),
);

import userRouter from "./routes/user.route.js";
import questionRouter from "./routes/question.route.js";
import submissionRouter from "./routes/submission.route.js";
import redis from "./config/redis.config.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/questions", questionRouter);
app.use("/api/v1/submissions", submissionRouter);

app.get("/api/v1/run/:runId", async (req, res) => {
  const result = await redis.get(`run:${req.params.runId}`);
  if (!result) return res.status(404).json({ error: "Result not found" });
  res.json(JSON.parse(result));
});

export default app;
