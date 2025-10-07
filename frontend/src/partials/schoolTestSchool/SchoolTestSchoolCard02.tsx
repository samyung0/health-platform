import SingleClassTotalGradeDonutChart from "~/charts/SingleClassTotalGradeDonutChart";
import {
  atomFitnessTestChosen,
  useAllSchoolTestRecordsBySchoolStore,
} from "~/states/schoolTestRecords";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";
function SingleSchoolTotalGradeDonutCard() {
  const data = useAllSchoolTestRecordsBySchoolStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const passingRate = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0) return null;
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades) return null;
    let totalParticipating = 0;
    let totalPassing = 0;
    for (const year in scoresGrades) {
      for (const class_ in scoresGrades[year]) {
        totalParticipating += parseInt(scoresGrades[year][class_][5]);
        totalPassing +=
          parseFloat(scoresGrades[year][class_][2]) * parseInt(scoresGrades[year][class_][5]);
      }
    }
    return ((totalPassing / totalParticipating) * 100).toFixed(1);
  }, [data, fitnessTestChosen]);
  const dataSet = useMemo(() => {
    if (!data || fitnessTestChosen.length === 0) return null;
    return fitnessTestChosen
      .map((test) => {
        const tt = testData.find((item) => item.name === test)!;
        const scoresGrades = testData.find(
          (item) => item.name === test
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!tt || !scoresGrades) return null;
        let passing = 0;
        let failing = 0;
        for (const year in scoresGrades) {
          for (const class_ in scoresGrades[year]) {
            passing += Math.round(
              parseFloat(scoresGrades[year][class_][2]) * parseInt(scoresGrades[year][class_][5])
            );
            failing += Math.round(
              (1 - parseFloat(scoresGrades[year][class_][2])) *
                parseInt(scoresGrades[year][class_][5])
            );
          }
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

export default SingleSchoolTotalGradeDonutCard;
