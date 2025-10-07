import SingleStudentOnlyOverallBarChart from "~/charts/SingleStudentOnlyOverallBarChart";
import { useMemo } from "react";
import { FRONTEND_EXERCISE_TYPES } from "~/lib/const";
import { useSchoolTests } from "~/states/schoolTest";
import {
  useAllSchoolTestRecordsByMeStore,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";
import { useStore } from "@nanostores/react";

function SingleStudentOnlyOverallBarCard() {
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
          (type) => item.find((item) => item.recordType === type)?.normalizedScore ?? null
        ).filter((m) => m !== null),
      });
    }
    return r;
  }, [data, fitnessTestChosen]);
  const passingRate = useMemo(() => {
    if (fitnessTestChosen.length === 0 || !mapped.find((m) => m.label === fitnessTestChosen[0]))
      return "--";
    const total = mapped
      .find((m) => m.label === fitnessTestChosen[0])
      ?.data.filter((m) => m !== null)! as number[];
    return ((total.filter((m) => m >= 60).length / total.length) * 100).toFixed(1) + "%";
  }, [mapped]);
  return (
    <div className="flex flex-col col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">整体成绩</h2>
      </header>
      <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
        总及格率 {passingRate}
      </div>
      <SingleStudentOnlyOverallBarChart
        dataFetched={mapped}
        exerciseTypes={FRONTEND_EXERCISE_TYPES}
        height={250}
      />
    </div>
  );
}

export default SingleStudentOnlyOverallBarCard;
