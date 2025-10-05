import { useQuery } from "@tanstack/react-query";
import { authClient } from "~/utils/betterAuthClient";
import { fitnessTestRouterClient } from "~/utils/routerClient";

export const useSchoolTests = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["schoolTests", { type: "session" }],
    queryFn: () => fitnessTestRouterClient.api.fitnesstests.getAll.$get().then((res) => res.json()),
    enabled: !!session,
  });
};
