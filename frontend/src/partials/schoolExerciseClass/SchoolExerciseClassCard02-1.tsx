import SingleClassOverallDurationBarChart from "~/charts/SingleClassOverallDurationBarChart";

function SingleClassOverallDurationBarCard() {
  return (
    <div className="flex flex-col col-span-full lg:col-span-8 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">各项运动人数</h2>
      </header>
      <SingleClassOverallDurationBarChart height={250} />
    </div>
  );
}

export default SingleClassOverallDurationBarCard;
