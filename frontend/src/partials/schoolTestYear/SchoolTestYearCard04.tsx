import SingleYearDetailGradeStackedBarChart from "~/charts/SingleYearDetailGradeStackedBarChart";
import SingleYearDetailScoreBarChart from "~/charts/SingleYearDetailScoreBarChart";

import { useMemo } from "react";
import { cn, findGradeFrontend } from "~/lib/utils";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import {
  atomYearChosen,
  useAllSchoolTestRecordsByYearStore,
  useSchoolTestClassFitnessTestChosen,
  useSchoolTestClassYearChosen,
} from "~/states/schoolTestRecords";
import { useStore } from "@nanostores/react";

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
// // const classRank = 2;
// const classPassRate = 80;
// // const dataSelected = [12321, 12322];
// const yearHighestScore = {
//   score: 25,
//   grade: "优秀" as (typeof GRADING_SCALE_KEYS)[number],
//   student: "SAM Y",
// };

function SingleClassDetailGradeBarCard({ type }: { type: string }) {
  const data = useAllSchoolTestRecordsByYearStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const { fitnessTestChosen } = useSchoolTestClassFitnessTestChosen();
  const yearChosen = useStore(atomYearChosen);
  console.log(yearChosen);

  const classes = useMemo(() => {
    if (!yearChosen || !allSchools) return [];
    const year = yearChosen;
    return allSchools[year].map(([class_]) => class_);
  }, [yearChosen, allSchools]);

  const totalStudents = useMemo(() => {
    if (!yearChosen || !allSchools) return {};
    const year = yearChosen;
    return Object.fromEntries(allSchools[year]);
  }, [yearChosen, allSchools]);

  const d = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearChosen || !allSchools) return null;
    const year = yearChosen;
    let sum = 0;
    let passing = 0;
    const people = allSchools[year].reduce((acc, curr) => acc + curr[1], 0);
    let bestStudent = {
      score: 0,
      grade: "--",
      student: "--",
    };
    if (!data[fitnessTestChosen[0]]?.[year]) return null;
    for (const record of data[fitnessTestChosen[0]][year]) {
      if (record.recordType === type && record.normalizedScore !== null) {
        if (type === "体重指数（BMI）") {
          sum += record.normalizedScore;
          if (record.grade !== "肥胖") {
            passing++;
          }
        } else {
          sum += record.normalizedScore;
          if (sum >= 60) {
            passing++;
          }
        }
        if (record.normalizedScore > bestStudent.score) {
          bestStudent = {
            score: record.normalizedScore,
            grade: record.grade ?? "--",
            student: record.recordToEntity.name,
          };
        }
      }
    }
    return {
      classScore: sum / people,
      grade: findGradeFrontend(sum / people),
      classPassRate: (passing / people) * 100,
      bestStudent: bestStudent,
    };
  }, [data, fitnessTestChosen, yearChosen]);

  const dataSet = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearChosen) return null;
    const year = yearChosen;
    const res: { label: string; date: Date; data: number[]; grade: string }[] = [];
    const classes = allSchools[year].map(([class_]) => class_);
    for (const test of fitnessTestChosen) {
      let gradeExcellent: Record<string, number> = {};
      let gradeGood: Record<string, number> = {};
      let gradeAverage: Record<string, number> = {};
      let gradeFailed: Record<string, number> = {};
      if (!data[test]?.[year]) continue;
      for (const record of data[test][year]) {
        if (!record.recordToEntity.class) continue;
        if (!gradeExcellent[record.recordToEntity.class]) {
          gradeExcellent[record.recordToEntity.class] = 0;
        }
        if (!gradeGood[record.recordToEntity.class]) {
          gradeGood[record.recordToEntity.class] = 0;
        }
        if (!gradeAverage[record.recordToEntity.class]) {
          gradeAverage[record.recordToEntity.class] = 0;
        }
        if (!gradeFailed[record.recordToEntity.class]) {
          gradeFailed[record.recordToEntity.class] = 0;
        }
        if (record.recordType === type && record.grade !== null) {
          if (type === "体重指数（BMI）") {
            gradeExcellent[record.recordToEntity.class] += record.grade === "正常" ? 1 : 0;
            gradeGood[record.recordToEntity.class] += record.grade === "低体重" ? 1 : 0;
            gradeAverage[record.recordToEntity.class] += record.grade === "超重" ? 1 : 0;
            gradeFailed[record.recordToEntity.class] += record.grade === "肥胖" ? 1 : 0;
          } else {
            gradeExcellent[record.recordToEntity.class] += record.grade === "优秀" ? 1 : 0;
            gradeGood[record.recordToEntity.class] += record.grade === "良好" ? 1 : 0;
            gradeAverage[record.recordToEntity.class] += record.grade === "及格" ? 1 : 0;
            gradeFailed[record.recordToEntity.class] += record.grade === "不及格" ? 1 : 0;
          }
        }
      }

      const da = new Date(testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date());
      res.push({
        label: test,
        date: da,
        data: classes.map((class_) => gradeExcellent[class_] ?? 0),
        grade: type === "体重指数（BMI）" ? "正常" : "优秀",
      });
      res.push({
        label: test,
        date: da,
        data: classes.map((class_) => gradeGood[class_] ?? 0),
        grade: type === "体重指数（BMI）" ? "低体重" : "良好",
      });
      res.push({
        label: test,
        date: da,
        data: classes.map((class_) => gradeAverage[class_] ?? 0),
        grade: type === "体重指数（BMI）" ? "超重" : "及格",
      });
      res.push({
        label: test,
        date: da,
        data: classes.map((class_) => gradeFailed[class_] ?? 0),
        grade: type === "体重指数（BMI）" ? "肥胖" : "不及格",
      });
    }
    return res;
  }, [data, fitnessTestChosen, yearChosen, testData]);

  const dataSet2 = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearChosen) return null;
    const year = yearChosen;
    const res: { label: string; date: Date; data: number[] }[] = [];
    const classes = allSchools[year].map(([class_]) => class_);
    for (const test of fitnessTestChosen) {
      let scores: Record<string, [number, number]> = {};
      if (!data[test]?.[year]) continue;
      for (const record of data[test][year]) {
        if (!record.recordToEntity.class) continue;
        if (!scores[record.recordToEntity.class]) {
          scores[record.recordToEntity.class] = [0, 0];
        }
        if (record.recordType === type && record.grade !== null) {
          scores[record.recordToEntity.class][0] += record.normalizedScore ?? 0;
          scores[record.recordToEntity.class][1] += 1;
        }
      }

      const da = new Date(testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date());
      res.push({
        label: test,
        date: da,
        data: classes.map((class_) =>
          scores[class_] ? scores[class_]?.[0] / scores[class_]?.[1] : 0
        ),
      });
    }
    return res;
  }, [data, fitnessTestChosen, yearChosen, testData]);

  console.log(dataSet, dataSet2, data, fitnessTestChosen, yearChosen, testData);

  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl justify-between">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex xl:items-center xl:justify-between justify-start items-stretch xl:flex-row flex-col flex-wrap gap-y-2 ">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
          一分钟俯卧撑
        </h2>
        <div className="flex justify-between items-center pt-3 xl:pt-0">
          {/* <div className="flex whitespace-nowrap -space-x-px">
            <button
              className={cn(
                "btn-xs sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-none first:rounded-l-lg last:rounded-r-lg",
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
          </div>
          <button
            className="btn-xs ml-4 rounded-lg sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
            onClick={() => setOpen(true)}
          >
            更多
          </button> */}
        </div>
      </header>
      <div className="grid grid-cols-13">
        <div className="col-span-full xl:col-span-3">
          <div className="flex items-start justify-start flex-col max-sm:*:w-1/2 pl-8 py-4 lg:py-6 gap-4">
            <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                2025年上学期
              </div>
              <span className="-ml-0.5">合格率 {d?.classPassRate ?? "--"}%</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                最高分
              </div>
              <div className="text-xs -mb-0.5 font-semibold text-gray-500 dark:text-gray-400 uppercase">
                三年のA班
              </div>
              <div className="flex items-start">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {d?.bestStudent.student} {d?.bestStudent.score}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium px-1.5 rounded-full",
                    d?.bestStudent.grade === "优秀"
                      ? "text-purple-700 bg-purple-500/20"
                      : d?.bestStudent.grade === "良好"
                      ? "text-green-700 bg-green-500/20"
                      : d?.bestStudent.grade === "及格"
                      ? "text-yellow-700 bg-yellow-500/20"
                      : "text-red-700 bg-red-500/20"
                  )}
                >
                  {d?.bestStudent.grade}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                年平均分
              </div>
              <div className="flex items-start">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {d?.classScore.toFixed(1) ?? "--"}
                </div>
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
                  {d?.grade}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-full xl:col-span-5">
          {dataSet2 &&
          dataSet2.length &&
          classes.length > 0 &&
          Object.keys(totalStudents).length > 0 ? (
            <SingleYearDetailScoreBarChart height={250} dataFetched={dataSet2} classes={classes} />
          ) : (
            <div className="flex flex-col justify-center items-center h-[200px]">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
        </div>
        <div className="col-span-full xl:col-span-5">
          {dataSet &&
          dataSet.length &&
          classes.length > 0 &&
          Object.keys(totalStudents).length > 0 ? (
            <SingleYearDetailGradeStackedBarChart
              height={250}
              dataFetched={dataSet}
              classes={classes}
              type={type}
              totalStudents={totalStudents}
            />
          ) : (
            <div className="flex flex-col justify-center items-center h-[200px]">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
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
                    <div className="flex flex-wrap -space-x-px">
                      <button
                        className={cn(
                          "btn-xs sm:px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-none first:rounded-l-lg last:rounded-r-lg",
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
                    </div>
                  </div>
                  <button
                    className="btn-sm px-4 lg:px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-red-500 whitespace-nowrap"
                    onClick={() => setOpen(false)}
                  >
                    关闭
                  </button>
                </header>
                <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2 flex sm:gap-4 gap-2 items-end flex-wrap">
                  一分钟俯卧撑
                </div>
                <MultipleEntitiesSingleExerciseBarChart />
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog> */}
    </div>
  );
}

export default SingleClassDetailGradeBarCard;
