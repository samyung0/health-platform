import MultipleEntitiesSingleExerciseBarChart from "~/charts/MultipleEntitiesSingleExerciseBarChart";
import { useState } from "react";
import { type GENDER_FILTER } from "~/lib/const";
import { cn } from "~/lib/utils";

// TODO: add id to the states

function MultipleStudentsSingleExerciseBarCard() {
  const [selected, setSelected] = useState<(typeof GENDER_FILTER)[number]>("总计");
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">一分钟俯卧撑</h2>
        <div className="flex flex-wrap items-center -m-1.5 mr-2">
          <div className="m-1.5">
            <div className="flex flex-wrap -space-x-px">
              <button
                className={cn(
                  "btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 rounded-none first:rounded-l-lg last:rounded-r-lg",
                  selected === "总计" && "text-violet-500"
                )}
                onClick={() => setSelected("总计")}
              >
                总计
              </button>
              <button
                className={cn(
                  "btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-none first:rounded-l-lg last:rounded-r-lg",
                  selected === "男生" && "text-violet-500"
                )}
                onClick={() => setSelected("男生")}
              >
                男生
              </button>
              <button
                className={cn(
                  "btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-none first:rounded-l-lg last:rounded-r-lg",
                  selected === "女生" && "text-violet-500"
                )}
                onClick={() => setSelected("女生")}
              >
                女生
              </button>
            </div>
          </div>
        </div>
      </header>
      <MultipleEntitiesSingleExerciseBarChart />
    </div>
  );
}

export default MultipleStudentsSingleExerciseBarCard;
