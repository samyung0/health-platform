import { useMemo } from "react";
import SingleClassDetailGradeBarChart from "~/charts/SingleClassDetailGradeBarChart";
import { cn, findGradeFrontend } from "~/lib/utils";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import {
  useAllSchoolTestRecordsByClassStore,
  atomClassChosen,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";
import { useStore } from "@nanostores/react";
import type { InferResponseType } from "hono/client";
import type { recordRouterClient } from "~/utils/routerClient";

// TODO: date as global state
// const testData = [
//   {
//     id: 12321,
//     name: "2025年上学期",
//   },
//   {
//     id: 12322,
//     name: "2024年下学期",
//   },
//   {
//     id: 12323,
//     name: "2024年上学期",
//   },
// ];

// const classScore = 23.5;
// const classGrade = "优秀" as (typeof GRADING_SCALE_KEYS)[number];
// const classPassRate = 80;
// const dataSelected = [12321, 12322];

function SingleClassDetailGradeBarCard({
  type,
  data,
}: {
  type: string;
  data: InferResponseType<
    typeof recordRouterClient.api.records.schoolTest.class.$get
  >["data"]["card4"][number];
}) {
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const dataSet = data.res;
  const d = data.d;
  const people = data.people;
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl justify-between">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex xl:items-center xl:justify-between justify-start items-stretch xl:flex-row flex-col flex-wrap gap-y-2 ">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{type}</h2>
        <div className="flex justify-between items-center pt-3 xl:pt-0">
          {/* <div className="flex whitespace-nowrap -space-x-px">
            <button
              className={cn(
                "btn-xs sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60  rounded-none first:rounded-l-lg last:rounded-r-lg",
                selected === "总计" && "text-violet-500 dark:text-violet-500"
              )}
              onClick={() => setSelected("总计")}
            >
              总计
            </button>
            <button
              className={cn(
                "btn-xs sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-none first:rounded-l-lg last:rounded-r-lg",
                selected === "男生" && "text-violet-500 dark:text-violet-500"
              )}
              onClick={() => setSelected("男生")}
            >
              男生
            </button>
            <button
              className={cn(
                "btn-xs sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-none first:rounded-l-lg last:rounded-r-lg",
                selected === "女生" && "text-violet-500 dark:text-violet-500"
              )}
              onClick={() => setSelected("女生")}
            >
              女生
            </button>
          </div> */}
          {/* <button
            className="btn-xs ml-4 rounded-lg sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
            onClick={() => setOpen(true)}
          >
            更多
          </button> */}
        </div>
      </header>
      <div className="grid grid-cols-12">
        <div className="col-span-full xl:col-span-5 2xl:col-span-4">
          <div className="flex items-start justify-start flex-col max-sm:*:w-1/2 pl-8 py-4 lg:py-6 gap-4">
            <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {fitnessTestChosen[0]}
              </div>
              <span className="-ml-0.5">合格率 {d?.classPassRate ?? "--"}%</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                班级得分
              </div>
              <div className="flex items-start">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {d?.classScore ?? "--"}
                </div>
                {d?.grade && (
                  <div
                    className={cn(
                      "text-sm font-medium px-1.5 rounded-full",
                      d?.grade === "优秀"
                        ? "text-purple-700 bg-purple-500/20"
                        : d?.grade === "良好"
                        ? "text-green-700 bg-green-500/20"
                        : d?.grade === "及格"
                        ? "text-yellow-700 bg-yellow-500/20"
                        : "text-red-700 bg-red-500/20"
                    )}
                  >
                    {d?.grade!}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-full xl:col-span-7 2xl:col-span-8 lg:-mt-3">
          {(!dataSet || dataSet.length === 0) && (
            <div className="flex flex-col justify-center items-center h-[200px]">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
          {dataSet && dataSet.length > 0 && (
            <SingleClassDetailGradeBarChart
              height={250}
              dataFetched={dataSet}
              type={type}
              totalStudents={people}
            />
          )}
        </div>
      </div>

      {/* <Dialog open={open} onClose={setOpen} className="relative z-[9999]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-[95vw] lg:w-[85vw] xl:w-[70vw] sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-none rounded-xl">
                <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-y-3 gap-6 lg:gap-12">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">所有成绩</h2>
                  </div>
                  <button
                    className="btn-sm px-4 lg:px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-red-500 whitespace-nowrap"
                    onClick={() => setOpen(false)}
                  >
                    关闭
                  </button>
                </header>
                <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2 flex sm:gap-4 gap-2 items-end flex-wrap">
                  {type}
                  <div className="lg:pl-6 flex flex-wrap sm:gap-4 gap-2">
                    <span className="lg:text-lg text-base text-gray-600 dark:text-gray-400">
                      平均分 {d?.classScore ?? "--"}分
                    </span>
                  </div>
                </div>
                {(!dataSet || dataSet.length === 0) && (
                  <div className="flex flex-col justify-center items-center h-[200px]">
                    <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                  </div>
                )}
                {dataSet && dataSet.length > 0 && (
                  <MultipleEntitiesSingleExerciseBarChart dataSet={dataSet} height={250} />
                )}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog> */}
    </div>
  );
}

export default SingleClassDetailGradeBarCard;
