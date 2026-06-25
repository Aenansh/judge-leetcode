import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    allowedHeaders: true,
    origin: "*",
  }),
);

import userRouter from "./routes/user.route.js";
import questionRouter from "./routes/question.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/questions", questionRouter);

export default app;
