import type { FileRouteType, FitnessTestRouteType, RecordRouteType, SchoolRouteType } from "@/app";
import { hc } from "hono/client";

export const recordRouterClient = hc<RecordRouteType>(import.meta.env.VITE_BACKEND_URL, {
  init: {
    credentials: "include",
  },
});

export const fileRouterClient = hc<FileRouteType>(import.meta.env.VITE_BACKEND_URL, {
  init: {
    credentials: "include",
  },
});

export const fitnessTestRouterClient = hc<FitnessTestRouteType>(import.meta.env.VITE_BACKEND_URL, {
  init: {
    credentials: "include",
  },
});

export const schoolRouterClient = hc<SchoolRouteType>(import.meta.env.VITE_BACKEND_URL, {
  init: {
    credentials: "include",
  },
});
