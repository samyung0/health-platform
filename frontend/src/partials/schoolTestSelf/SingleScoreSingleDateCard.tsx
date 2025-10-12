import type { InferResponseType } from "hono/client";
import { cn } from "~/lib/utils";
import type { recordRouterClient } from "~/utils/routerClient";

function SingleScoreSingleDateCard({
  data,
}: {
  data: InferResponseType<
    typeof recordRouterClient.api.records.schoolTest.self.$get
  >["data"]["singleScore"][number];
}) {
  return (
    <div className="flex flex-col col-span-full md:col-span-6 lg:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{data.type}</h2>
      </header>
      <div className="px-5 py-4">
        <div className="flex items-center flex-wrap max-sm:*:w-1/2">
          <div className="pr-6 sm:pr-8">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
              个人得分
            </div>
            <div className="flex items-start">
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {data.score}
              </div>
              {data.grade !== "--" && (
                <div
                  className={cn(
                    "text-sm font-medium px-1.5 rounded-full",
                    data.grade === "优秀"
                      ? "text-purple-700 bg-purple-500/20"
                      : data.grade === "良好"
                      ? "text-green-700 bg-green-500/20"
                      : data.grade === "及格"
                      ? "text-yellow-700 bg-yellow-500/20"
                      : "text-red-700 bg-red-500/20"
                  )}
                >
                  {data.grade}
                </div>
              )}
            </div>
          </div>
          <div
            className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mr-5"
            aria-hidden="true"
          ></div>
          <div>
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
              班级平均分
            </div>
            <div className="flex items-start">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {data.classAverage}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SingleScoreSingleDateCard;
