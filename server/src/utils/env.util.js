import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
};

export default env;
