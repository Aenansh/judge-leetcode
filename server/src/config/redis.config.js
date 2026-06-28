import Redis from "ioredis";
import env from "../utils/env.util.js";

const url = env.REDIS_URL;
const redis = new Redis(url);

redis.on("connect", () =>
  console.log("[Redis] Successfully connected to cache."),
);
redis.on("error", (err) =>
  console.error("[Redis] Cache connection error:", err.message),
);

export default redis;
