import { AppBindings } from "@/lib/types";
import cors from "@/middlewares/cors";
import notFound from "@/middlewares/not-found";
import onError from "@/middlewares/on-error";
// import withQueryParams from "@/middlewares/with-query-params";
import { Hono } from "hono";
import { requestId } from "hono/request-id";

export function createRouter() {
  return new Hono<AppBindings>({
    strict: false,
  });
}

export default function createApp() {
  const app = createRouter();

  app.use("*", cors);

  app.use(requestId());
  app.onError(onError);
  app.notFound(notFound);
  return app;
}
