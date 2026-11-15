import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["molodoy"],
  migrations: { schema: "molodoy", table: "__drizzle_migrations" },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
