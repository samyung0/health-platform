import SingleSchoolOnlyOverallBarChart from "~/charts/SingleSchoolOnlyOverallBarChart";
import { useAllSchoolTestRecordsBySchoolStore } from "~/states/schoolTestRecords";

function SingleSchoolTotalYearParticipationCard() {
  const years = useAllSchoolTestRecordsBySchoolStore().data?.years ?? [];
  const dataSet = useAllSchoolTestRecordsBySchoolStore().data?.card31DataSet ?? null;
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">年级参与度</h2>
      </header>
      {dataSet && dataSet.length > 0 && years.length > 0 ? (
        <SingleSchoolOnlyOverallBarChart height={240} dataFetched={dataSet} entity={years} />
      ) : (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default SingleSchoolTotalYearParticipationCard;
