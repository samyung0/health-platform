import SingleStudentOnlyAnyLineChart from "~/charts/SingleStudentOnlyAnyLineChart";
import { cn } from "~/lib/utils";

const exerciseType = "体重指数（BMI）（千克/米2）";
const exerciseDuration = 120;
const averageScore = 23.5;
const averageGrade = "优秀";
const bestScore = 25;
const bestGrade = "优秀";
function SingleStudentOnlyAnyCard() {
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{exerciseType}</h2>
      </header>
      <div className="grid grid-cols-12">
        <div className="col-span-full xl:col-span-5 2xl:col-span-4">
          <div className="flex items-start justify-start flex-col max-sm:*:w-1/2 pl-8 py-4 lg:py-6 gap-4">
            <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                运动时间
              </div>
              <span className="-ml-0.5">{exerciseDuration}分钟</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                平均得分
              </div>
              <div className="flex items-start">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {averageScore}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium px-1.5 rounded-full",
                    averageGrade === "优秀"
                      ? "text-purple-700 bg-purple-500/20"
                      : averageGrade === "良好"
                      ? "text-green-700 bg-green-500/20"
                      : averageGrade === "及格"
                      ? "text-yellow-700 bg-yellow-500/20"
                      : "text-red-700 bg-red-500/20"
                  )}
                >
                  {averageGrade}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                最高分
              </div>
              <div className="flex items-start">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {bestScore}
                </div>
                <div
                  className={cn(
                    "text-xs font-medium px-1 rounded-full",
                    bestGrade === "优秀"
                      ? "text-purple-700 bg-purple-500/20"
                      : bestGrade === "良好"
                      ? "text-green-700 bg-green-500/20"
                      : bestGrade === "及格"
                      ? "text-yellow-700 bg-yellow-500/20"
                      : "text-red-700 bg-red-500/20"
                  )}
                >
                  {bestGrade}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-full xl:col-span-7 2xl:col-span-8 lg:-mt-3">
          <SingleStudentOnlyAnyLineChart height={250} />
        </div>
      </div>
    </div>
  );
}

export default SingleStudentOnlyAnyCard;
