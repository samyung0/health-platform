import AnyDetailGradeBarChart from "~/charts/AnyDetailGradeBarChart";
import SingleClassOnlyParticipationLineChart2 from "~/charts/SingleClassOnlyParticipationLineChart2";

const exerciseType = "体重指数（BMI）（千克/米2）";
const exerciseDuration = 120;
const exercisePeople = 100;
const avgPassing = 80;
const classTotalPeople = 100;
function SingleClassAnyExerciseCard() {
  return (
    <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-full bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{exerciseType}</h2>
      </header>
      <div className="grid grid-cols-13">
        <div className="col-span-full xl:col-span-3">
          <div className="flex items-start justify-start flex-col max-sm:*:w-1/2 pl-8 py-4 lg:py-6 gap-4">
            <div className="text-xl lg:text-xl font-bold text-gray-800 dark:text-gray-100">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                总运动人数
              </div>
              <span className="-ml-0.5">
                {exercisePeople}人（{Math.round((exercisePeople / classTotalPeople) * 100)}%）
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                总运动时间
              </div>
              <div className="flex items-start">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {exerciseDuration}分钟
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                总及格率
              </div>
              <div className="flex items-start">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                  {avgPassing}%
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-full xl:col-span-4">
          <AnyDetailGradeBarChart height={250} />
        </div>
        <div className="col-span-full xl:col-span-6">
          <SingleClassOnlyParticipationLineChart2 height={250} />
        </div>
      </div>
    </div>
  );
}

export default SingleClassAnyExerciseCard;
