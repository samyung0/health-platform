import {
  atomHomeExerciseDateRangeChosen,
  useAllHomeExerciseRecordsByMeStore,
} from "~/states/homeExerciseRecords";
import { useStore } from "@nanostores/react";
import { useMemo } from "react";

// const exerciseDays = 7;
// const dateRange = 12;
// const totalDuration = 120;
function SingleScoreSingleDateCard() {
  const data = useAllHomeExerciseRecordsByMeStore().data;
  const date = useStore(atomHomeExerciseDateRangeChosen);
  const d = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    let exerciseDay = new Set();
    let exerciseDuration = 0;
    for (const record of data) {
      if (!record.exerciseDate) continue;
      if (
        new Date(record.exerciseDate!) >= date.from &&
        new Date(record.exerciseDate!) <= date.to
      ) {
        exerciseDay.add(new Date(record.exerciseDate!).toDateString());
        exerciseDuration += record.exerciseDuration ?? 0;
      }
    }
    return { exerciseDay: Array.from(exerciseDay), exerciseDuration };
  }, [data, date]);
  return (
    <div className="flex flex-col col-span-full md:col-span-4 xl:col-span-3 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总运动量</h2>
      </header>
      <div className="pl-8 py-4 lg:py-6 ">
        <div className="flex flex-col items-start justify-start max-sm:*:w-1/2 gap-6">
          <div className="pr-6 sm:pr-8">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              运动日期
            </div>
            <div className="flex items-start">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {d?.exerciseDay.length ?? "--"}天
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              运动时间
            </div>
            <div className="flex items-start">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {d?.exerciseDuration.toFixed(1) ?? "--"}分钟
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SingleScoreSingleDateCard;
