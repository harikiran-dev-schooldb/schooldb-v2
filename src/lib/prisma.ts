import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
  postgresPool?: Pool;
};

const postgresPool =
  globalForPrisma.postgresPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: positiveInteger(
      process.env.DATABASE_POOL_MAX,
      process.env.VERCEL ? 5 : 10,
    ),
    idleTimeoutMillis: positiveInteger(
      process.env.DATABASE_POOL_IDLE_TIMEOUT_MS,
      30_000,
    ),
    connectionTimeoutMillis: positiveInteger(
      process.env.DATABASE_POOL_CONNECT_TIMEOUT_MS,
      10_000,
    ),
    application_name: process.env.DATABASE_APPLICATION_NAME || "schooldb",
  });

const adapter = new PrismaPg(postgresPool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.postgresPool = postgresPool;
}
