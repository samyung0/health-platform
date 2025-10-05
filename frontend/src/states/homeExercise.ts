import { useQuery } from "@tanstack/react-query";
import { authClient } from "~/utils/betterAuthClient";
import { recordRouterClient } from "~/utils/routerClient";

export const useHomeExerciseRecords = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["homeExerciseRecords", { type: "session" }],
    queryFn: () =>
      recordRouterClient.api.records.homeExercise.$get({ query: {} }).then((res) => res.json()),
    enabled: !!session,
  });
};
