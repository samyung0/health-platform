import SingleStudentOnlyAnyLineChart from "~/charts/SingleStudentOnlyAnyLineChart";
import { cn, findGradeFrontend } from "~/lib/utils";
import {
  atomHomeExerciseDateRangeChosen,
  useAllHomeExerciseRecordsByMeStore,
} from "~/states/homeExerciseRecords";
import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import Grading_ from "@/data/persistent/grading.json";

const Grading = Grading_ as Record<
  string,
  Record<string, Record<string, Record<string, number[][]>>>
>;

// const exerciseType = "体重指数（BMI）（千克/米2）";
// const exerciseDuration = 120;
// const averageScore = 23.5;
// const averageGrade = "优秀";
// const bestScore = 25;
// const bestGrade = "优秀";
function SingleStudentOnlyAnyCard({ type }: { type: string }) {
  const data = useAllHomeExerciseRecordsByMeStore().data;
  const date = useStore(atomHomeExerciseDateRangeChosen);

  const d = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    let duration = 0;
    let totalScore = 0;
    let bestScore = 0;
    let bestNormScore = 0;
    let totalCounted = 0;
    let totalNormScore = 0;
    for (const rec of data) {
      if (!rec.score || !rec.exerciseDate || rec.recordType !== type || !rec.normalizedScore)
        continue;
      duration += rec.exerciseDuration ?? 0;
      totalScore += rec.score;
      if (rec.score > bestScore) {
        bestScore = rec.score;
        bestNormScore = rec.normalizedScore;
      }
      totalCounted++;
      totalNormScore += rec.normalizedScore;
    }
    if (totalCounted === 0) return null;
    return {
      duration: (duration / totalCounted).toFixed(1),
      totalScore: (totalScore / totalCounted).toFixed(1),
      bestScore: bestScore.toFixed(1),
      avgGrade: findGradeFrontend(totalNormScore / totalCounted),
      bestGrade: findGradeFrontend(bestNormScore),
    };
  }, [data, date]);

  const dataSet = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    const typeData: { score: number; createdAt: string }[] = [];
    for (const rec of data) {
      if (!rec.score || !rec.exerciseDate || rec.recordType !== type) continue;
      typeData.push({
        score: rec.score,
        createdAt: rec.exerciseDate,
      });
    }
    if (typeData.length === 0) return null;
    typeData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return [
      {
        label: type,
        data: typeData,
      },
    ];
  }, [data, date]);

  const line = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    const gender = data[0].recordToEntity.gender;
    const schoolType = data[0].recordToEntity.schoolType;
    const year = data[0].recordToEntity.year || "六年级";
    if (!gender || !schoolType || !year || !Grading[type]?.[gender]?.[schoolType]?.[year])
      return null;
    for (let i = Grading[type][gender][schoolType][year].length - 1; i >= 0; i--) {
      if (Grading[type][gender][schoolType][year][i][0] >= 60) {
        return Grading[type][gender][schoolType][year][i][1];
      }
    }
    return null;
  }, [data, date]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{type}</h2>
      </header>
      <div className="grid grid-cols-12">
        <div className="col-span-full xl:col-span-5 2xl:col-span-4">
          <div className="flex items-start justify-start flex-col max-sm:*:w-1/2 pl-8 py-4 lg:py-6 gap-4">
            <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                运动时间
              </div>
              <span className="-ml-0.5">{d?.duration ?? "--"}分钟</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                最高分
              </div>
              <div className="flex items-start">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {d?.bestScore ?? "--"}
                </div>
                {d?.bestGrade && (
                  <div
                    className={cn(
                      "text-xs font-medium px-1 rounded-full",
                      d.bestGrade === "优秀"
                        ? "text-purple-700 bg-purple-500/20"
                        : d.bestGrade === "良好"
                        ? "text-green-700 bg-green-500/20"
                        : d.bestGrade === "及格"
                        ? "text-yellow-700 bg-yellow-500/20"
                        : "text-red-700 bg-red-500/20"
                    )}
                  >
                    {d.bestGrade}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-full xl:col-span-7 2xl:col-span-8 lg:-mt-3">
          {dataSet && dataSet.length > 0 && date && date.to && date.from ? (
            <SingleStudentOnlyAnyLineChart
              height={250}
              dataFetched={dataSet}
              timeRange={{ from: date.from!, to: date.to! }}
              passing={line}
            />
          ) : (
            <div className="flex flex-col justify-center items-center h-[200px]">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SingleStudentOnlyAnyCard;
