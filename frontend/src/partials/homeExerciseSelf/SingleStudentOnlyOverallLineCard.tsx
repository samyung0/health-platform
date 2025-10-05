import SingleStudentOnlyOverallLineChart from "~/charts/SingleStudentOnlyOverallLineChart";

function SingleStudentOnlyOverallLineCard() {
  return (
    <div className="flex flex-col col-span-full sm:col-span-12 xl:col-span-9 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">整体成绩</h2>
      </header>
      <SingleStudentOnlyOverallLineChart height={250} />
    </div>
  );
}

export default SingleStudentOnlyOverallLineCard;
