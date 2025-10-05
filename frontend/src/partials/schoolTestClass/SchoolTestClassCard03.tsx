// import SingleClassTotalScoreBarChart from "~/charts/SingleClassTotalScoreBarChart";
import {
  useAllSchoolTestRecordsByClassStore,
  useSchoolTestClassFitnessTestChosen,
  useSchoolTestClassClassChosen,
} from "~/states/schoolTestRecords";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";
import { cn } from "~/lib/utils";

function SingleClassTotalScoreCard() {
  const data = useAllSchoolTestRecordsByClassStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const { fitnessTestChosen } = useSchoolTestClassFitnessTestChosen();
  const { classChosen: yearClassChosen } = useSchoolTestClassClassChosen();
  const d = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades || !scoresGrades[year]?.[class_]) return null;
    return scoresGrades[year][class_];
  }, [data, fitnessTestChosen, yearClassChosen]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总平均成绩</h2>
      </header>
      {/* TODO: hide if more than one year */}
      <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
        {d?.[0] ?? "--"}分
      </div>
      {d?.[1] !== "--" && (
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
          {d?.[1]}
        </div>
      )}
      {/* <SingleClassTotalScoreBarChart height={240} /> */}
    </div>
  );
}

export default SingleClassTotalScoreCard;
