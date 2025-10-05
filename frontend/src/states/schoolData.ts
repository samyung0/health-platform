import { useQuery } from "@tanstack/react-query";
import { authClient } from "~/utils/betterAuthClient";
import { schoolRouterClient } from "~/utils/routerClient";

export const useAllSchoolData = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["allSchoolData", { type: "session" }],
    queryFn: () =>
      schoolRouterClient.api.schools.allYearsAndClasses.$get().then((res) => res.json()),
    enabled: !!session,
  });
};

export const useQueryableSchoolData = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["queryableSchoolData", { type: "session" }],
    queryFn: () =>
      schoolRouterClient.api.schools.queryableYearsAndClasses.$get().then((res) => res.json()),
    enabled: !!session,
  });
};
