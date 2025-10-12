import SingleClassTotalGradeDonutChart from "~/charts/SingleClassTotalGradeDonutChart";
import { useAllSchoolTestRecordsByYearStore } from "~/states/schoolTestRecords";

function SingleClassTotalGradeDonutCard() {
  const passingRate = useAllSchoolTestRecordsByYearStore().data?.passingRate ?? null;
  const dataSet = useAllSchoolTestRecordsByYearStore().data?.dataSetCard2 ?? null;
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

export default SingleClassTotalGradeDonutCard;
