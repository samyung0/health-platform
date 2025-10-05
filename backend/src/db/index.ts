import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";

console.log("DATABASE_URL", process.env.DATABASE_URL);
export const db = drizzle({
  // logger: true,
  connection: process.env.DATABASE_URL!,
  casing: "snake_case",
  schema,
});
