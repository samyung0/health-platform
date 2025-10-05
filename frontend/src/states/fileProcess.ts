import { useQuery } from "@tanstack/react-query";
import { authClient } from "~/utils/betterAuthClient";
import { fileRouterClient } from "~/utils/routerClient";

export const useFileProcesses = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["fileProcesses", { type: "session" }],
    queryFn: () => fileRouterClient.api.files.myFileProcess.$get().then((res) => res.json()),
    refetchInterval: 1000 * 30,
    enabled: !!session,
  });
};
