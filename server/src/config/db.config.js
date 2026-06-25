import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import env from "../utils/env.util.js";

const connectionString = env.DATABASE_URL;
const adapter = new PrismaNeon({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
