// import SingleClassTotalScoreBarChart from "~/charts/SingleClassTotalScoreBarChart";
import { cn } from "~/lib/utils";
import { useAllSchoolTestRecordsByClassStore } from "~/states/schoolTestRecords";

function SingleClassTotalScoreCard() {
  const d = useAllSchoolTestRecordsByClassStore().data?.data.card3 ?? null;
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总成绩</h2>
      </header>
      <div className="flex flex-col items-start px-10 py-6 gap-4">
        <div className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            总分
          </div>
          <div className="flex items-start">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
              {d?.[0] ?? "--"}
            </div>
            {d?.[1] && (
              <div
                className={cn(
                  "text-sm font-medium px-1.5 rounded-full",
                  d?.[1] === "优秀"
                    ? "text-purple-700 bg-purple-500/20"
                    : d?.[1] === "良好"
                    ? "text-green-700 bg-green-500/20"
                    : d?.[1] === "及格"
                    ? "text-yellow-700 bg-yellow-500/20"
                    : "text-red-700 bg-red-500/20"
                )}
              >
                {d?.[1]!}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            平均得分
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
            {d?.[3] ?? "--"}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            平均加分
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
            {d?.[4] ?? "--"}
          </div>
        </div>
      </div>
      {/* <SingleClassTotalScoreBarChart height={240} /> */}
    </div>
  );
}

export default SingleClassTotalScoreCard;
