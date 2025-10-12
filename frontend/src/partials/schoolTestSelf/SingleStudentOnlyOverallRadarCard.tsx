import SingleStudentOnlyOverallRadarChart from "~/charts/SingleStudentOnlyOverallRadarChart";
import { FRONTEND_EXERCISE_TYPES } from "~/lib/const";
import { useAllSchoolTestRecordsByMeStore } from "~/states/schoolTestRecords";

function SingleStudentOnlyOverallRadarCard() {
  const data = useAllSchoolTestRecordsByMeStore().data?.data.overallRadar ?? [];
  return (
    <div className="flex flex-col col-span-full sm:col-span-12 xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">整体成绩（分布图）</h2>
      </header>
      {data.length === 0 && (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-xl text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
      {data.length > 0 && (
        <SingleStudentOnlyOverallRadarChart
          dataFetched={data}
          exerciseTypes={FRONTEND_EXERCISE_TYPES}
        />
      )}
    </div>
  );
}

export default SingleStudentOnlyOverallRadarCard;
