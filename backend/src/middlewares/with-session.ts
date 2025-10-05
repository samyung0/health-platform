import { auth } from "@/lib/auth";
import { AppBindings } from "@/lib/types";
import type { MiddlewareHandler } from "hono";

const withSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    throw new Error("Unauthorized");
  }

  console.log("entity logged in: ", session.allClassifications[0].entityId);
  c.set("session", session);

  return next();
};

export default withSession;
