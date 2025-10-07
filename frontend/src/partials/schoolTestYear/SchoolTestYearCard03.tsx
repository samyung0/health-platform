import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { cn, findGradeFrontend } from "~/lib/utils";
import { useSchoolTests } from "~/states/schoolTest";
import {
  atomYearChosen,
  useAllSchoolTestRecordsByYearStore,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";

function SingleClassTotalScoreCard() {
  const data = useAllSchoolTestRecordsByYearStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const yearChosen = useStore(atomYearChosen);
  const d = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearChosen) return null;
    let sumAvgNorm = 0;
    let sumNorm = 0;
    let sumParticipating = 0;
    let sumAdditional = 0;
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades || !scoresGrades[yearChosen]) return null;
    for (const class_ in scoresGrades[yearChosen]) {
      const total = parseInt(scoresGrades[yearChosen][class_][5]);
      sumAvgNorm += parseFloat(scoresGrades[yearChosen][class_][0]) * total;
      sumNorm += parseFloat(scoresGrades[yearChosen][class_][3]) * total;
      sumParticipating += total;
      sumAdditional += parseFloat(scoresGrades[yearChosen][class_][4]) * total;
    }
    return [
      (sumAvgNorm / sumParticipating).toFixed(1),
      findGradeFrontend(sumAvgNorm / sumParticipating),
      -1,
      (sumNorm / sumParticipating).toFixed(1),
      (sumAdditional / sumParticipating).toFixed(1),
    ];
  }, [data, fitnessTestChosen, yearChosen]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总平均成绩</h2>
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
      {/* <SingleClassTotalScoreChart height={240} /> */}
    </div>
  );
}

export default SingleClassTotalScoreCard;
