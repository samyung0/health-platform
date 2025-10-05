import SingleClassTotalGradeDonutChart from "~/charts/SingleClassTotalGradeDonutChart";
function SingleSchoolTotalGradeDonutCard() {
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总成绩及格率</h2>
      </header>
      {/* TODO: hide if more than one year */}
      <div className="px-5 pt-4 text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">81%</div>
      <SingleClassTotalGradeDonutChart height={240} />
    </div>
  );
}

export default SingleSchoolTotalGradeDonutCard;
