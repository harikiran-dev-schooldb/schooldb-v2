import "dotenv/config";
import { defineConfig } from "prisma/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use a direct database connection for Prisma CLI operations such as migrations.
    // Fall back to DATABASE_URL for local setups that only define one connection.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
});
