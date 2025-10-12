import SingleStudentOnlyOverallBarChart from "~/charts/SingleStudentOnlyOverallBarChart";
import { FRONTEND_EXERCISE_TYPES } from "~/lib/const";
import { useAllSchoolTestRecordsByMeStore } from "~/states/schoolTestRecords";

function SingleStudentOnlyOverallBarCard() {
  const dataMapped = useAllSchoolTestRecordsByMeStore().data?.data.overallBar || [];
  const passingRate = useAllSchoolTestRecordsByMeStore().data?.data.overalBarPassingRate || "--";
  return (
    <div className="flex flex-col col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">整体成绩</h2>
      </header>
      <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
        总及格率 {passingRate}
      </div>
      <SingleStudentOnlyOverallBarChart
        dataFetched={dataMapped}
        exerciseTypes={FRONTEND_EXERCISE_TYPES}
        height={250}
      />
    </div>
  );
}

export default SingleStudentOnlyOverallBarCard;
