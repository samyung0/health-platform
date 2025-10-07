import SingleClassTotalParticipationDonutChart from "~/charts/SingleClassTotalParticipationDonutChart";
import {
  useAllSchoolTestRecordsByYearStore,
  atomYearChosen,
  atomFitnessTestChosen,
} from "~/states/schoolTestRecords";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";

function SingleYearTotalParticipationDonutCard() {
  const data = useAllSchoolTestRecordsByYearStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const yearChosen = useStore(atomYearChosen);
  const totalPeopleThisTest = useMemo<number | null>(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearChosen || !allSchools) return null;
    const scoresGrades = testData.find(
      (item) => item.name === fitnessTestChosen[0]
    )?.mainUploadYearsAndClassesScoresGrades;
    if (!scoresGrades || scoresGrades[yearChosen] === undefined) return null;
    let sum = 0;
    for (const class_ in scoresGrades[yearChosen]) {
      sum += parseInt(scoresGrades[yearChosen][class_][5]);
    }
    return sum;
  }, [data, fitnessTestChosen, yearChosen]);

  const totalPeople = useMemo<Record<string, [number, number]> | null>(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearChosen || !allSchools) return null;
    const r: Record<string, [number, number]> = {};
    for (const fitnessTest of fitnessTestChosen) {
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || scoresGrades[yearChosen] === undefined) return null;
      let sum = 0;
      for (const class_ in scoresGrades[yearChosen]) {
        sum += parseInt(scoresGrades[yearChosen][class_][5]);
      }
      const allStudents = allSchools[yearChosen].reduce((acc, curr) => acc + curr[1], 0);
      r[fitnessTest] = [sum, allStudents - sum];
    }
    return r;
  }, [data, fitnessTestChosen, yearChosen, allSchools]);
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

export default SingleYearTotalParticipationDonutCard;
