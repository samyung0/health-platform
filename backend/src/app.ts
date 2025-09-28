import createApp from "@/lib/create-app";
import withSession from "@/middlewares/with-session";
import auth from "@/routes/auth.route";
import file from "@/routes/file.route";
import record from "@/routes/record.route";

const app = createApp();

app.use("*", (c, next) => {
  console.log("request", c.req.raw.url);
  return next();
});

app.get("/api/health", (c) => {
  return c.text("OK");
});

const authRoute = app.route("/api/auth", auth);

app.use("*", withSession);
const recordRoute = app.route("/api/records", record);
const fileRoute = app.route("/api/files", file);

export type AuthRouteType = typeof authRoute;
export type RecordRouteType = typeof recordRoute;
export type FileRouteType = typeof fileRoute;

export default app;
