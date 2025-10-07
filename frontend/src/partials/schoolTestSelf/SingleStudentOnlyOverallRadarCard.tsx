import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import SingleStudentOnlyOverallRadarChart from "~/charts/SingleStudentOnlyOverallRadarChart";
import { FRONTEND_EXERCISE_TYPES } from "~/lib/const";
import { useSchoolTests } from "~/states/schoolTest";
import {
  useAllSchoolTestRecordsByMeStore,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";

function SingleStudentOnlyOverallRadarCard() {
  const data = useAllSchoolTestRecordsByMeStore().data;
  const testData = useSchoolTests().data;
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const mapped = useMemo(() => {
    if (!data || !testData?.data) return [];
    const r: { label: string; date: Date; data: (number | null)[] }[] = [];
    for (const key of Object.keys(data)) {
      if (!fitnessTestChosen.includes(key)) continue;
      const item = data[key as keyof typeof data];
      r.push({
        label: key,
        date: new Date(
          testData.data.find((item) => item.id === key)?.fitnessTestDate ?? new Date()
        ),
        data: FRONTEND_EXERCISE_TYPES.map(
          (type) => item.find((item) => item.recordType === type)?.normalizedScore ?? 0
        ),
      });
    }
    return r;
  }, [data, fitnessTestChosen]);
  console.log(mapped);
  return (
    <div className="flex flex-col col-span-full sm:col-span-12 xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">整体成绩（分布图）</h2>
      </header>
      {mapped.length === 0 && (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-xl text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
      {mapped.length > 0 && (
        <SingleStudentOnlyOverallRadarChart
          dataFetched={mapped}
          exerciseTypes={FRONTEND_EXERCISE_TYPES}
        />
      )}
    </div>
  );
}

export default SingleStudentOnlyOverallRadarCard;
