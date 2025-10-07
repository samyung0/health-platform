import SingleClassTotalParticipationDonutChart from "~/charts/SingleClassTotalParticipationDonutChart";
import {
  useAllSchoolTestRecordsBySchoolStore,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";

function SingleSchoolTotalParticipationDonutCard() {
  const data = useAllSchoolTestRecordsBySchoolStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const totalPeopleThisTest = useMemo<number | null>(() => {
    if (!data || fitnessTestChosen.length === 0 || !allSchools) return null;
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades) return null;
    let sum = 0;
    for (const year in scoresGrades) {
      for (const class_ in scoresGrades[year]) {
        sum += parseInt(scoresGrades[year][class_][5]);
      }
    }
    return sum;
  }, [data, fitnessTestChosen]);

  const totalPeople = useMemo<Record<string, [number, number]> | null>(() => {
    if (!data || fitnessTestChosen.length === 0 || !allSchools) return null;
    const r: Record<string, [number, number]> = {};
    for (const fitnessTest of fitnessTestChosen) {
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades) return null;
      let sum = 0,
        totalStudents = 0;
      for (const year in scoresGrades) {
        for (const class_ in scoresGrades[year]) {
          sum += parseInt(scoresGrades[year][class_][5]);
        }
      }
      for (const year in allSchools) {
        totalStudents += allSchools[year].reduce((acc, curr) => acc + curr[1], 0);
      }
      r[fitnessTest] = [sum, totalStudents - sum];
    }
    return r;
  }, [data, fitnessTestChosen, allSchools]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总参与人数</h2>
      </header>
      <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
        {totalPeopleThisTest || "--"}人
      </div>
      {totalPeople && Object.keys(totalPeople).length > 0 && (
        <SingleClassTotalParticipationDonutChart
          height={240}
          dataSet={Object.entries(totalPeople).map(([label, data]) => ({
            label,
            date: new Date(
              testData.find((item) => item.name === label)?.fitnessTestDate ?? new Date()
            ),
            data,
          }))}
        />
      )}
      {(!totalPeople || Object.keys(totalPeople).length === 0) && (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default SingleSchoolTotalParticipationDonutCard;
