import { db } from "@/db";
import * as schema from "@/db/schema";
import { reset, seed } from "drizzle-seed";

// TODO: refine logic according to better auth specs (if any)
async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Cannot seed database in non-development environment");
  }
  console.log("Resetting and seeding database...");
  await reset(db, schema);
  console.log("Database reset successfully");
  await seed(db, schema);
  console.log("Database seeded successfully");
}

main();
