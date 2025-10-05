import SingleSchoolOnlyOverallBarChart from "~/charts/SingleSchoolOnlyOverallBarChart";

function SingleSchoolTotalYearPassingRateCard() {
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">年级及格率</h2>
      </header>
      <SingleSchoolOnlyOverallBarChart height={240} />
    </div>
  );
}

export default SingleSchoolTotalYearPassingRateCard;
