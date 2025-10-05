import { createRouter } from "@/lib/create-app";
import { checkValidSession, getAllYearsAndClasses, getQueryableYearsAndClasses } from "@/lib/util";

const router = createRouter()
  .get("/allYearsAndClasses", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));
    const allYearsAndClasses = await getAllYearsAndClasses(session.allClassifications[0].schoolId);
    return c.json({ data: allYearsAndClasses });
  })
  .get("/queryableYearsAndClasses", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));
    const queryableYearsAndClasses = await getQueryableYearsAndClasses(session, entityType);
    return c.json({ data: queryableYearsAndClasses });
  });

export default router;
