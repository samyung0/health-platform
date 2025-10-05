import createApp from "@/lib/create-app";
import withSession from "@/middlewares/with-session";
import auth from "@/routes/auth.route";
import file from "@/routes/file.route";
import fitnessTest from "@/routes/fitnesstests.route";
import record from "@/routes/record.route";
import school from "@/routes/school.route";

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
const fitnessTestRoute = app.route("/api/fitnesstests", fitnessTest);
const schoolRoute = app.route("/api/schools", school);

export type AuthRouteType = typeof authRoute;
export type RecordRouteType = typeof recordRoute;
export type FileRouteType = typeof fileRoute;
export type FitnessTestRouteType = typeof fitnessTestRoute;
export type SchoolRouteType = typeof schoolRoute;
export default app;
