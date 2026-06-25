import Redis from "ioredis";
import env from "../utils/env.util.js";

const url = env.REDIS_URL;
const redis = new Redis(url);

export default redis;
