import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";
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

export const useAllSchoolTestRecordsByMeStore = () => {
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["session", "allSchoolTestRecords", "self", fitnessTestChosen],
    queryFn: () =>
      recordRouterClient.api.records.schoolTest.self
        .$get({
          query: {
            testName: fitnessTestChosen,
          },
        })
        .then((res) => res.json()),
    enabled: !!session && fitnessTestChosen.length > 0,
  });
};

export const useAllSchoolTestRecordsByClassStore = () => {
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const yearClassChosen = useStore(atomClassChosen);
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["session", "allSchoolTestRecords", "class", fitnessTestChosen, yearClassChosen],
    queryFn: () =>
      recordRouterClient.api.records.schoolTest.class
        .$get({
          query: {
            testName: fitnessTestChosen,
            class: yearClassChosen,
          },
        })
        .then((res) => res.json()),
    enabled: !!session && fitnessTestChosen.length > 0 && yearClassChosen !== null,
  });
};

export const useAllSchoolTestRecordsByYearStore = () => {
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const yearChosen = useStore(atomYearChosen);
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["session", "allSchoolTestRecords", "year", fitnessTestChosen, yearChosen],
    queryFn: () =>
      recordRouterClient.api.records.schoolTest.year
        .$get({
          query: {
            testName: fitnessTestChosen,
            year: yearChosen,
          },
        })
        .then((res) => res.json()),
    enabled: !!session && fitnessTestChosen.length > 0 && yearChosen !== null,
  });
};

export const useAllSchoolTestRecordsBySchoolStore = () => {
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["session", "allSchoolTestRecords", "school", fitnessTestChosen],
    queryFn: () =>
      recordRouterClient.api.records.schoolTest.school
        .$get({
          query: {
            testName: fitnessTestChosen,
          },
        })
        .then((res) => res.json()),
    enabled: !!session && fitnessTestChosen.length > 0,
  });
};
