import { auth } from "@/lib/auth";
import { AppBindings } from "@/lib/types";
import type { MiddlewareHandler } from "hono";

const withSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  console.log("session", session);

  if (!session) {
    throw new Error("Unauthorized");
  }

  c.set("session", session);

  return next();
};

export default withSession;
