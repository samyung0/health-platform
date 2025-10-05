import SingleClassTotalGradeDonutChart from "~/charts/SingleClassTotalGradeDonutChart";
import {
  useSchoolTestClassFitnessTestChosen,
  useAllSchoolTestRecordsByYearStore,
} from "~/states/schoolTestRecords";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { atomYearChosen } from "~/states/schoolTestRecords";

function SingleClassTotalGradeDonutCard() {
  const data = useAllSchoolTestRecordsByYearStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const { fitnessTestChosen } = useSchoolTestClassFitnessTestChosen();
  const yearClassChosen = useStore(atomYearChosen);
  const passingRate = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen;
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades || !scoresGrades[year]) return null;
    return scoresGrades[year][2];
  }, [data, fitnessTestChosen, yearClassChosen]);
  const dataSet = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen;
    if (!allSchools[year]) return [];
    return fitnessTestChosen
      .map((test) => {
        const tt = testData.find((item) => item.name === test)!;
        let passing = 0;
        let failing = 0;
        if (!tt.mainUploadYearsAndClassesScoresGrades[year]) return null;
        for (const [class_, s] of Object.entries(tt.mainUploadYearsAndClassesScoresGrades[year])) {
          const c = allSchools[year].find(([class2, total]) => class2 === class_);
          if (!c) continue;
          passing += Math.round(parseFloat(s[2]) * c[1]);
          failing += Math.round((1 - parseFloat(s[2])) * c[1]);
        }
        return {
          label: test,
          date: new Date(tt.fitnessTestDate ?? new Date()),
          data: [passing, failing] as [number, number],
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
      {dataSet && dataSet.length > 0 && (
        <SingleClassTotalGradeDonutChart height={240} dataSet={dataSet} />
      )}
      {(!dataSet || dataSet.length === 0) && (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default SingleClassTotalGradeDonutCard;
