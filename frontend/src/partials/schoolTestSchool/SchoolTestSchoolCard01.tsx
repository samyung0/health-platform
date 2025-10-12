import SingleClassTotalParticipationDonutChart from "~/charts/SingleClassTotalParticipationDonutChart";
import { useSchoolTests } from "~/states/schoolTest";
import { useAllSchoolTestRecordsBySchoolStore } from "~/states/schoolTestRecords";

function SingleSchoolTotalParticipationDonutCard() {
  const testData = useSchoolTests().data?.data ?? [];
  const totalPeopleThisTest =
    useAllSchoolTestRecordsBySchoolStore().data?.totalPeopleThisTest ?? null;
  const totalPeople = useAllSchoolTestRecordsBySchoolStore().data?.totalPeople ?? null;
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">总参与人数</h2>
      </header>
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

export default SingleSchoolTotalParticipationDonutCard;
