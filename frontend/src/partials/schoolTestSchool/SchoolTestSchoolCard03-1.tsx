import SingleSchoolOnlyOverallBarChart from "~/charts/SingleSchoolOnlyOverallBarChart";
import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { getYearOrder } from "~/lib/utils";
import { useSchoolTests } from "~/states/schoolTest";
import {
  atomFitnessTestChosen,
  useAllSchoolTestRecordsBySchoolStore,
  useAllSchoolTestRecordsByYearStore,
} from "~/states/schoolTestRecords";

function SingleSchoolTotalYearParticipationCard() {
  const data = useAllSchoolTestRecordsBySchoolStore().data;
  const yearData = useAllSchoolTestRecordsByYearStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const years = useMemo(() => {
    if (!yearData || fitnessTestChosen.length === 0) return [];
    const allYears = new Set<string>();
    for (const test of fitnessTestChosen) {
      if (!yearData[test]) continue;
      const t = Object.keys(yearData[test]);
      for (const year of t) {
        allYears.add(year);
      }
    }
    return Array.from(allYears).toSorted((a, b) => getYearOrder(a[0]) - getYearOrder(b[0]));
  }, [yearData, fitnessTestChosen]);
  const dataSet = useMemo(() => {
    if (!data || !testData || fitnessTestChosen.length === 0 || years.length === 0) return [];
    const r: { label: string; date: Date; data: number[] }[] = [];
    for (const test of fitnessTestChosen) {
      if (!data[test]) continue;
      let totalParticipation: Record<string, Set<string>> = {};
      let total: Record<string, Set<string>> = {};
      for (const record of data[test]) {
        if (!record.recordToEntity.year) continue;
        if (!total[record.recordToEntity.year]) {
          total[record.recordToEntity.year] = new Set();
          totalParticipation[record.recordToEntity.year] = new Set();
        }
        total[record.recordToEntity.year].add(record.recordToEntity.entityId);
        if (record.normalizedScore !== null) {
          totalParticipation[record.recordToEntity.year].add(record.recordToEntity.entityId);
        }
      }
      const da = new Date(testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date());
      r.push({
        label: test,
        date: da,
        data: years
          .map((year) =>
            total[year] !== undefined
              ? Number(((totalParticipation[year].size / total[year].size) * 100).toFixed(1))
              : null
          )
          .filter((m) => m !== null),
      });
    }
    return r;
  }, [data, testData, fitnessTestChosen, years]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">年级参与度</h2>
      </header>
      {dataSet && dataSet.length > 0 && years.length > 0 ? (
        <SingleSchoolOnlyOverallBarChart height={240} dataFetched={dataSet} entity={years} />
      ) : (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default SingleSchoolTotalYearParticipationCard;
