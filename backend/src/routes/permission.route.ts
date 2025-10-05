import { db } from "@/db";
import { permission } from "@/db/schema";
import { createRouter } from "@/lib/create-app";
import { checkValidSession } from "@/lib/util";
import { eq } from "drizzle-orm";

const router = createRouter().get("/me", async (c) => {
  const [session, entityType] = checkValidSession(c.get("session"));
  const permissions = await db
    .select()
    .from(permission)
    .where(eq(permission.entityId, session.activeClassifications[0].entityId));
  return c.json(permissions);
});
