import SingleClassTotalGradeDonutChart from "~/charts/SingleClassTotalGradeDonutChart";
import {
  useAllSchoolTestRecordsByClassStore,
  atomFitnessTestChosen,
  atomClassChosen,
} from "~/states/schoolTestRecords";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";

function SingleClassTotalGradeDonutCard() {
  const data = useAllSchoolTestRecordsByClassStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const yearClassChosen = useStore(atomClassChosen);
  const passingRate = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades || scoresGrades[year]?.[class_] === undefined) return null;
    return Number(scoresGrades[year][class_][2]) * 100;
  }, [data, fitnessTestChosen, yearClassChosen]);
  const dataSet = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    return fitnessTestChosen
      .map((test) => {
        const tt = testData.find((item) => item.name === test)!;
        const scoresGrades = testData.find(
          (item) => item.name === test
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!tt || !scoresGrades || scoresGrades[year]?.[class_] === undefined) return null;
        const participatedStudents = parseInt(scoresGrades[year][class_][5]);
        const passingRate = parseFloat(scoresGrades[year][class_][2]);
        return {
          label: test,
          date: new Date(tt.fitnessTestDate ?? new Date()),
          data: [
            Math.round(passingRate * participatedStudents),
            participatedStudents - Math.round(passingRate * participatedStudents),
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
