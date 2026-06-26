import redis from "../config/redis.config.js";

const rateLimitSubmission = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "User ID required for submission." });
    }

    const cooldownKey = `cooldown:submission:${userId}`;

    const onCooldown = await redis.get(cooldownKey);

    if (onCooldown) {
      return res.status(429).json({
        error: "Please wait 10 seconds before submitting again.",
      });
    }

    await redis.set(cooldownKey, "locked", "EX", 10);
    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next();
  }
};

export { rateLimitSubmission };
