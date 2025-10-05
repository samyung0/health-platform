import { db } from "@/db";
import { fitnessTest } from "@/db/schema";
import { createRouter } from "@/lib/create-app";
import { checkValidSession } from "@/lib/util";
import { and, desc, eq, gt } from "drizzle-orm";

const router = createRouter().get("/getAll", async (c) => {
  const [session, entityType] = checkValidSession(c.get("session"));

  if (entityType === "student" || entityType === "parent") {
    // get earliest validFrom
    const sessionSorted = session.allClassifications.toSorted(
      (a, b) => a.validFrom.getTime() - b.validFrom.getTime()
    );

    const fitnessTest_ = await db
      .select()
      .from(fitnessTest)
      .where(
        and(
          eq(fitnessTest.schoolId, session.allClassifications[0].schoolId),
          gt(fitnessTest.fitnessTestDate, sessionSorted[0].validFrom)
        )
      );

    return c.json({ data: fitnessTest_ });
  }

  const fitnessTest_ = await db
    .select()
    .from(fitnessTest)
    .where(eq(fitnessTest.schoolId, session.allClassifications[0].schoolId))
    .orderBy(desc(fitnessTest.fitnessTestDate));

  return c.json({ data: fitnessTest_ });
});

export default router;
