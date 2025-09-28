import * as schema from "@/db/schema";
import env from "@/env-runtime";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle({
  // logger: true,
  connection: env.DATABASE_URL,
  casing: "snake_case",
  schema,
});
