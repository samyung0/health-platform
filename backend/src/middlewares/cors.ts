import { cors } from "hono/cors";

export default cors({
  origin: process.env.FRONTEND_URL!,
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  exposeHeaders: ["Content-Length", "X-Request-ID"],
  maxAge: 86400, // 24 hours
  credentials: true,
});
