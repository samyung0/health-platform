import SingleYearOverallParticipationBarChart from "~/charts/SingleYearOverallParticipationBarChart";

function SingleYearOverallDurationBarCard() {
  return (
    <div className="flex flex-col col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">各班运动人数</h2>
      </header>
      <SingleYearOverallParticipationBarChart height={250} />
    </div>
  );
}

export default SingleYearOverallDurationBarCard;
