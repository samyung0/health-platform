import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/env-runtime";
import * as schema from "@/db/schema";

export const db = drizzle({
  connection: env.DATABASE_URL,
  casing: "snake_case",
  schema,
});
