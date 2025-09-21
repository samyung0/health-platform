import createApp from "@/lib/create-app";
import withSession from "@/middlewares/with-session";
import auth from "@/routes/auth.route";

// Import individual table routes
import record from "@/routes/record.route";

const app = createApp();

const routes = [record] as const;

app.get("/api/health", (c) => {
  return c.text("OK");
});

app.route("/", auth);

app.use("*", withSession);

routes.forEach((route) => {
  app.route("/api", route);
});

export default app;
