// import { AppBindings } from "@/lib/types";
// import { MiddlewareHandler } from "hono/types";

// const withQueryParams: MiddlewareHandler<AppBindings> = async (c, next) => {
//   const queryParams = c.req.query() as AppBindings["Variables"]["parsedQueryParams"];
//   Object.keys(queryParams).forEach((key) => {
//     if (!Array.isArray(queryParams[key]) && queryParams[key].includes(",")) {
//       queryParams[key] = queryParams[key].split(",");
//     }
//   });
//   c.set("parsedQueryParams", queryParams);
//   return next();
// };

// export default withQueryParams;
