import jwt from "jsonwebtoken";
import env from "../utils/env.util.js";

const verifyToken = async (req, res, next) => {
  try {
    const token =
      req.cookies?.access_token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    console.log("Error in verifying jwt.", error.message);
    return res.status(401).json({
      error:
        error.name === "TokenExpiredError"
          ? "Access token expired."
          : "Invalid access token.",
    });
  }
};

export { verifyToken };
