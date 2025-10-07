import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { atom } from "nanostores";
import { useEffect, useMemo } from "react";
import { getYearOrder } from "~/lib/utils";
import { useQueryableSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { authClient } from "~/utils/betterAuthClient";
import { recordRouterClient } from "~/utils/routerClient";

const $getSchoolTestRecords = recordRouterClient.api.records.schoolTest.$get;

export const useAllSchoolTestRecords = () => {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["session", "allSchoolTestRecords"],
    queryFn: () =>
      recordRouterClient.api.records.schoolTest
        .$get({
          query: {},
        })
        .then((res) => res.json()),
    enabled: !!session,
  });
};

export const useAllSchoolTestRecordsBySchoolStore = () => {
  const r = useAllSchoolTestRecords();
  return {
    ...r,
    data: r.data?.data.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      if (!fitnessTestName) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = [];
      }
      acc[fitnessTestName].push(record);
      return acc;
    }, {} as Record<string, InferResponseType<typeof $getSchoolTestRecords>["data"]>),
  };
};

export const useAllSchoolTestRecordsByYearStore = () => {
  const r = useAllSchoolTestRecords();
  return {
    ...r,
    data: r.data?.data.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      if (!fitnessTestName || !year) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = [];
      }
      acc[fitnessTestName][year].push(record);
      return acc;
    }, {} as Record<string, Record<string, InferResponseType<typeof $getSchoolTestRecords>["data"]>>),
  };
};

export const useAllSchoolTestRecordsByClassStore = () => {
  const r = useAllSchoolTestRecords();
  return {
    ...r,
    data: r.data?.data.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      const class_ = record.recordToEntity.class;
      if (!fitnessTestName || !year || !class_) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = {};
      }
      if (!acc[fitnessTestName][year][class_]) {
        acc[fitnessTestName][year][class_] = [];
      }
      acc[fitnessTestName][year][class_].push(record);
      return acc;
    }, {} as Record<string, Record<string, Record<string, InferResponseType<typeof $getSchoolTestRecords>["data"]>>>),
  };
};

export const useAllSchoolTestRecordsByMeStore = () => {
  const r = useAllSchoolTestRecords();
  const { data: session } = authClient.useSession();
  return {
    ...r,
    data: r.data?.data
      .filter(
        (record) => record.recordToEntity.entityId === session?.allClassifications[0].entityId
      )
      .reduce((acc, record) => {
        const fitnessTestName = record.fitnessTestName;
        if (!fitnessTestName) return acc;
        if (!acc[fitnessTestName]) {
          acc[fitnessTestName] = [];
        }
        acc[fitnessTestName].push(record);
        return acc;
      }, {} as Record<string, InferResponseType<typeof $getSchoolTestRecords>["data"]>),
  };
};

export const atomFitnessTestChosen = atom<string[]>([]);
export const useSchoolTestFitnessTestAvailable = () => {
  const data = useSchoolTests().data?.data ?? [];
  const available = useMemo(() => data.map((item) => item.name), [data]);
  useEffect(() => {
    if (available.length > 0 && atomFitnessTestChosen.get().length === 0) {
      atomFitnessTestChosen.set([available[0]]);
    }
  }, [available]);
  return {
    fitnessTestAvailable: available,
  };
};

export const atomClassChosen = atom<string | null>(null);
export const useSchoolTestClassAvailable = () => {
  const queryableYearsAndClasses = useQueryableSchoolData().data?.data ?? {};
  const available = useMemo(
    () =>
      Object.entries(queryableYearsAndClasses)
        .toSorted((a, b) => getYearOrder(a[0]) - getYearOrder(b[0]))
        .map(([year, classes]) =>
          classes
            .toSorted((a, b) => {
              const numA = parseInt(a.split("班")[0]);
              const numB = parseInt(b.split("班")[0]);
              return numA - numB;
            })
            .map((class_) => `${year}${class_}`)
        )
        .flat(),
    [queryableYearsAndClasses]
  );
  useEffect(() => {
    if (available.length > 0 && atomClassChosen.get() === null) {
      atomClassChosen.set(available[0]);
    }
  }, [available]);
  return {
    classAvailable: available,
  };
};

export const atomYearChosen = atom<string | null>(null);
export const useSchoolTestYearAvailable = () => {
  const queryableYearsAndClasses = useQueryableSchoolData().data?.data ?? {};
  const available = useMemo(
    () =>
      Object.keys(queryableYearsAndClasses).toSorted((a, b) => getYearOrder(a) - getYearOrder(b)),
    [queryableYearsAndClasses]
  );
  useEffect(() => {
    if (available.length > 0 && atomYearChosen.get() === null) {
      atomYearChosen.set(available[0]);
    }
  }, [available]);
  return {
    yearAvailable: available,
  };
};
