import { db } from "@/db";
import * as schema from "@/db/schema";
import { reset } from "drizzle-seed";

async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Cannot drop database in non-development environment");
  }
  console.log("Resetting database...");
  await reset(db, schema);
  console.log("Database reset successfully");
}

main();
