import { useMemo } from "react";
import { cn } from "~/lib/utils";
import {
  useAllSchoolTestRecordsByClassStore,
  useAllSchoolTestRecordsByMeStore,
  useSchoolTestSelfFitnessTestChosen,
} from "~/states/schoolTestRecords";
import { authClient } from "~/utils/betterAuthClient";

const measureTypeName = "体重指数（BMI）（千克/米2）";
// const score = 23.5;
// const grade = "正常" as (typeof GRADING_SCALE_BMI_KEYS)[number];
// const height = 170;
// const weight = 70;
// const classAverage = 28.5;
// const classGrade = "超重" as (typeof GRADING_SCALE_BMI_KEYS)[number];
function SingleScoreSingleDateCard() {
  const { data: session } = authClient.useSession();
  const data = useAllSchoolTestRecordsByMeStore().data;
  const classData = useAllSchoolTestRecordsByClassStore().data;
  const { fitnessTestChosen } = useSchoolTestSelfFitnessTestChosen();
  const d = useMemo(() => {
    const r = {
      score: "--",
      grade: "--",
      height: "--",
      weight: "--",
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
      data[fitnessTestChosen[0]]
        .find((m) => m.recordType === "体重指数（BMI）")
        ?.normalizedScore?.toFixed(1) ?? "--";
    r.grade =
      data[fitnessTestChosen[0]].find((m) => m.recordType === "体重指数（BMI）")?.grade ?? "--";
    r.height =
      data[fitnessTestChosen[0]]
        .find((m) => m.recordType === "身高")
        ?.normalizedScore?.toFixed(1) ?? "--";
    r.weight =
      data[fitnessTestChosen[0]]
        .find((m) => m.recordType === "体重")
        ?.normalizedScore?.toFixed(1) ?? "--";
    if (
      session &&
      session.activeClassifications.length > 0 &&
      session.activeClassifications[0].year &&
      session.activeClassifications[0].class
    ) {
      const bmiRecords = classData[fitnessTestChosen[0]]?.[session.activeClassifications[0].year]?.[
        session.activeClassifications[0].class
      ]?.filter((m) => m.recordType === "体重指数（BMI）");
      if (bmiRecords && bmiRecords.length > 0) {
        const classSum = bmiRecords?.reduce((acc, curr) => {
          return acc + (curr.normalizedScore ?? 0);
        }, 0);
        const classAverage = classSum / bmiRecords?.length;
        r.classAverage = classAverage.toFixed(1);
      }
    }
    return r;
  }, [data, classData, fitnessTestChosen, session]);
  return (
    <div className="flex flex-col col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{measureTypeName}</h2>
      </header>
      <div className="px-6 lg:px-12 py-4 lg:py-6 flex flex-col gap-6">
        <div className="flex items-center flex-wrap max-sm:*:w-1/2">
          <div className="pr-6 sm:pr-8">
            <div className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
              身高（厘米）
            </div>
            <div className="flex items-start">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {d.height}
              </div>
            </div>
          </div>
          <div
            className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mr-5"
            aria-hidden="true"
          ></div>
          <div className="pr-6 sm:pr-8">
            <div className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
              体重（千克）
            </div>
            <div className="flex items-start">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {d.weight}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center flex-wrap max-sm:*:w-1/2">
          <div>
            <div className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
              体重指数（BMI）（千克/米2）
            </div>
            <div className="flex items-start">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                {d.score}
              </div>
              {d.grade !== "--" && (
                <div
                  className={cn(
                    "text-sm font-medium px-1.5 rounded-full",
                    d.grade === "正常"
                      ? "text-green-700 bg-green-500/20"
                      : d.grade === "超重" || d.grade === "低体重"
                      ? "text-yellow-700 bg-yellow-500/20"
                      : "text-red-700 bg-red-500/20"
                  )}
                >
                  {d.grade}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center flex-wrap max-sm:*:w-1/2">
          <div className="pr-6 sm:pr-8">
            <div className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
              班级平均
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
