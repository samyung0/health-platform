import { useQuery } from "@tanstack/react-query";
import { atom } from "nanostores";
import { authClient } from "~/utils/betterAuthClient";
import { recordRouterClient } from "~/utils/routerClient";

export const useHomeExerciseRecords = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["session", "homeExerciseRecords"],
    queryFn: () =>
      recordRouterClient.api.records.homeExercise.$get({ query: {} }).then((res) => res.json()),
    enabled: !!session,
  });
};

export const useAllHomeExerciseRecordsByMeStore = () => {
  const r = useHomeExerciseRecords();
  const { data: session } = authClient.useSession();
  return {
    ...r,
    data: r.data?.data.filter(
      (record) => record.recordToEntity.entityId === session?.allClassifications[0].entityId
    ),
  };
};

export const atomHomeExerciseDateRangeChosen = atom<
  { from: Date | undefined; to?: Date | undefined } | undefined
>(undefined);
