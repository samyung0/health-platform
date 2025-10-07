import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import SingleStudentOnlyOverallLineChart from "~/charts/SingleStudentOnlyOverallLineChart";
import {
  atomHomeExerciseDateRangeChosen,
  useAllHomeExerciseRecordsByMeStore,
} from "~/states/homeExerciseRecords";

function SingleStudentOnlyOverallLineCard() {
  const data = useAllHomeExerciseRecordsByMeStore().data;
  const date = useStore(atomHomeExerciseDateRangeChosen);
  const d = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    const temp = data.filter(
      (item) =>
        new Date(item.exerciseDate!) >= date.from! && new Date(item.exerciseDate!) <= date.to!
    );
    const res: Record<string, { createdAt: string; normalizedScore: number }[]> = {};
    for (const rec of temp) {
      if (!res[rec.recordType]) {
        res[rec.recordType] = [];
      }
      if (!rec.normalizedScore || !rec.exerciseDate) continue;
      res[rec.recordType].push({
        createdAt: rec.exerciseDate,
        normalizedScore: rec.normalizedScore,
      });
    }
    for (const t in res) {
      res[t].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return Object.entries(res).map(([label, data]) => ({ label, data }));
  }, [data, date]);
  return (
    <div className="flex flex-col col-span-full sm:col-span-12 xl:col-span-9 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">整体成绩</h2>
      </header>
      {d && d.length > 0 && date && date.to && date.from ? (
        <SingleStudentOnlyOverallLineChart
          height={250}
          dataFetched={d}
          timeRange={{ from: date.from!, to: date.to! }}
        />
      ) : (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default SingleStudentOnlyOverallLineCard;
