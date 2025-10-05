import SingleClassTotalGradeDonutChart from "~/charts/SingleClassTotalGradeDonutChart";
import {
  useAllSchoolTestRecordsByClassStore,
  useSchoolTestClassFitnessTestChosen,
  useSchoolTestClassClassChosen,
} from "~/states/schoolTestRecords";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";

function SingleClassTotalGradeDonutCard() {
  const data = useAllSchoolTestRecordsByClassStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const { fitnessTestChosen } = useSchoolTestClassFitnessTestChosen();
  const { classChosen: yearClassChosen } = useSchoolTestClassClassChosen();
  const passingRate = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades || !scoresGrades[year]?.[class_]) return null;
    return scoresGrades[year][class_][2];
  }, [data, fitnessTestChosen, yearClassChosen]);
  const dataSet = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    const classTotalPeople = allSchools[year].find(([class_, total]) => class_ === class_)?.[1];
    if (!classTotalPeople) return [];
    return fitnessTestChosen
      .map((test) => {
        const tt = testData.find((item) => item.name === test)!;
        if (!tt.mainUploadYearsAndClassesScoresGrades[year]?.[class_]?.[2]) return null;
        const passingRate = parseFloat(tt.mainUploadYearsAndClassesScoresGrades[year][class_][2]);
        return {
          label: test,
          date: new Date(tt.fitnessTestDate ?? new Date()),
          data: [
            Math.round(passingRate * classTotalPeople),
            classTotalPeople - Math.round(passingRate * classTotalPeople),
          ] as [number, number],
        };
      })
      .filter((item) => item !== null);
  }, [passingRate]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总成绩及格率</h2>
      </header>
      {/* TODO: hide if more than one year */}
      <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
        {passingRate ?? "--"}%
      </div>
      {(!dataSet || dataSet.length === 0) && (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
      {dataSet && dataSet.length > 0 && (
        <SingleClassTotalGradeDonutChart height={240} dataSet={dataSet} />
      )}
    </div>
  );
}

export default SingleClassTotalGradeDonutCard;
