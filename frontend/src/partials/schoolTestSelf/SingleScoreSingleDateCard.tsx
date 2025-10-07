import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { cn } from "~/lib/utils";
import {
  useAllSchoolTestRecordsByClassStore,
  useAllSchoolTestRecordsByMeStore,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";
import { authClient } from "~/utils/betterAuthClient";

function SingleScoreSingleDateCard({ type }: { type: string }) {
  const { data: session } = authClient.useSession();
  const data = useAllSchoolTestRecordsByMeStore().data;
  const classData = useAllSchoolTestRecordsByClassStore().data;
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const d = useMemo(() => {
    const r = {
      score: "--",
      grade: "--",
      classAverage: "--",
    };
    if (
      !session ||
      !data ||
      !classData ||
      fitnessTestChosen.length === 0 ||
      !Object.keys(data).includes(fitnessTestChosen[0]) ||
      !Object.keys(classData).includes(fitnessTestChosen[0])
    )
      return r;
    r.score =
      data[fitnessTestChosen[0]].find((m) => m.recordType === type)?.normalizedScore?.toFixed(1) ??
      "--";
    r.grade = data[fitnessTestChosen[0]].find((m) => m.recordType === type)?.grade ?? "--";
    if (
      session &&
      session.activeClassifications.length > 0 &&
      session.activeClassifications[0].year &&
      session.activeClassifications[0].class
    ) {
      const classRecords = classData[fitnessTestChosen[0]]?.[
        session.activeClassifications[0].year
      ]?.[session.activeClassifications[0].class]?.filter((m) => m.recordType === type);
      if (classRecords && classRecords.length > 0) {
        const classSum = classRecords?.reduce((acc, curr) => {
          return acc + (curr.normalizedScore ?? 0);
        }, 0);
        const classAverage = classSum / classRecords?.length;
        r.classAverage = classAverage.toFixed(1);
      }
    }
    return r;
  }, [data, classData, fitnessTestChosen, session]);
  return (
    <div className="flex flex-col col-span-full md:col-span-6 lg:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{type}</h2>
      </header>
      <div className="px-5 py-4">
        <div className="flex items-center flex-wrap max-sm:*:w-1/2">
          <div className="pr-6 sm:pr-8">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
              个人得分
            </div>
            <div className="flex items-start">
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {d.score}
              </div>
              {d.grade !== "--" && (
                <div
                  className={cn(
                    "text-sm font-medium px-1.5 rounded-full",
                    d.grade === "优秀"
                      ? "text-purple-700 bg-purple-500/20"
                      : d.grade === "良好"
                      ? "text-green-700 bg-green-500/20"
                      : d.grade === "及格"
                      ? "text-yellow-700 bg-yellow-500/20"
                      : "text-red-700 bg-red-500/20"
                  )}
                >
                  {d.grade}
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
                {d.classAverage}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SingleScoreSingleDateCard;
