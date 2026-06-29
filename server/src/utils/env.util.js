import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
};

export default env;
