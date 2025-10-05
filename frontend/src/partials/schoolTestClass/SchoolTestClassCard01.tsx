import { useMemo } from "react";
import SingleClassTotalParticipationDonutChart from "~/charts/SingleClassTotalParticipationDonutChart";
import {
  useAllSchoolTestRecordsByClassStore,
  useSchoolTestClassFitnessTestChosen,
  useSchoolTestClassClassChosen,
} from "~/states/schoolTestRecords";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";

function SingleClassTotalParticipationDonutCard() {
  const data = useAllSchoolTestRecordsByClassStore().data;
  const testData = useSchoolTests().data?.data ?? [];
  const allSchools = useAllSchoolData().data?.data ?? {};
  const { fitnessTestChosen } = useSchoolTestClassFitnessTestChosen();
  const { classChosen: yearClassChosen } = useSchoolTestClassClassChosen();
  const totalPeopleThisTest = useMemo<number | null>(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    if (!year || !class_ || !data[fitnessTestChosen[0]]?.[year]?.[class_]) return null;
    const participatedStudents = new Set<string>();
    for (const record of data[fitnessTestChosen[0]][year][class_]) {
      if (record.score !== null) participatedStudents.add(record.recordToEntity.entityId);
    }
    return participatedStudents.size;
  }, [data, fitnessTestChosen, yearClassChosen]);

  const totalPeople = useMemo<Record<string, [number, number]> | null>(() => {
    if (!data || fitnessTestChosen.length === 0 || !yearClassChosen || !allSchools) return null;
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    if (!year || !class_) return null;
    const r: Record<string, [number, number]> = {};
    for (const fitnessTest of fitnessTestChosen) {
      const participatedStudents = new Set<string>();
      const allStudents = new Set<string>();
      if (!data[fitnessTest]?.[year]?.[class_]) continue;
      for (const record of data[fitnessTest][year][class_]) {
        if (record.score !== null) participatedStudents.add(record.recordToEntity.entityId);
        allStudents.add(record.recordToEntity.entityId);
      }
      r[fitnessTest] = [participatedStudents.size, allStudents.size - participatedStudents.size];
    }
    return r;
  }, [data, fitnessTestChosen, yearClassChosen]);
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总参与人数</h2>
      </header>
      {/* TODO: hide if more than one year */}
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

export default SingleClassTotalParticipationDonutCard;
