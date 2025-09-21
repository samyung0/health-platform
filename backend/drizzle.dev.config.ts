import env from "@/env-runtime";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/db/dev/migrations",
  schema: "./src/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
