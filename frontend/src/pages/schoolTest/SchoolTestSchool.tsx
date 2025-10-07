import { useState } from "react";

import Sidebar from "~/partials/Sidebar";
import Header from "~/partials/Header";
import MultiSelect from "../../components/MultiSelect";
import SingleSchoolTotalParticipationCard from "~/partials/schoolTestSchool/SchoolTestSchoolCard01";
import SingleSchoolTotalGradeCard from "~/partials/schoolTestSchool/SchoolTestSchoolCard02";
import SingleSchoolTotalScoreCard from "~/partials/schoolTestSchool/SchoolTestSchoolCard03";
import SingleClassDetailGradeBarCard from "~/partials/schoolTestSchool/SchoolTestSchoolCard04";
import SingleSchoolTotalYearParticipationCard from "~/partials/schoolTestSchool/SchoolTestSchoolCard03-1";
import SingleSchoolTotalYearPassingRateCard from "~/partials/schoolTestSchool/SchoolTestSchoolCard03-2";

import { useMemo } from "react";
import { FRONTEND_EXERCISE_TYPES } from "~/lib/const";
import {
  atomFitnessTestChosen,
  useSchoolTestFitnessTestAvailable,
  useAllSchoolTestRecordsBySchoolStore,
} from "~/states/schoolTestRecords";
import { getChartColor } from "~/utils/Utils";
import { authClient } from "~/utils/betterAuthClient";
import { useStore } from "@nanostores/react";

// const testData = [
//   {
//     id: 12321,
//     name: "2025年上学期",
//   },
//   {
//     id: 12322,
//     name: "2024年下学期",
//   },
//   {
//     id: 12323,
//     name: "2024年上学期",
//   },
// ];

function Dashboard() {
  const { data: session } = authClient.useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { fitnessTestAvailable } = useSchoolTestFitnessTestAvailable();
  const fitnessTestChosen = useStore(atomFitnessTestChosen);
  const data = useAllSchoolTestRecordsBySchoolStore().data;

  const [colors] = useMemo(
    () => getChartColor(fitnessTestAvailable.length),
    [fitnessTestAvailable.length]
  );

  if (!session) return <div>加载中 ...</div>;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/*  Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
            {/* Dashboard actions */}
            <div className="sm:flex sm:justify-between sm:items-center mb-4">
              {/* Left: Title */}
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                  学校成绩
                </h1>
              </div>
            </div>

            <div className="sm:flex sm:justify-between sm:items-center mb-5">
              <div className="mb-4 sm:mb-0 mr-2">
                <ul className="flex flex-wrap items-center -m-1">
                  {fitnessTestChosen.map((fitnessTestName, index) => (
                    <li className="m-1" key={fitnessTestName}>
                      <button
                        className="btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-500 dark:text-gray-400 hover:[&>div:last-child]:opacity-100"
                        onClick={() =>
                          atomFitnessTestChosen.set(
                            fitnessTestChosen.filter((name) => name !== fitnessTestName)
                          )
                        }
                      >
                        <div
                          className="w-1 h-3.5 shrink-0"
                          style={{ backgroundColor: colors[index] }}
                        ></div>
                        <span className="ml-1.5">{fitnessTestName}</span>

                        <div className="opacity-60 ml-3 ease-out duration-200">
                          <div className="sr-only">Close</div>
                          <svg
                            className="fill-current size-3"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                          >
                            <path d="M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z" />
                          </svg>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Right side */}
              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* TODO: bind events to global state */}
                  <MultiSelect
                    options={fitnessTestAvailable.map((fitnessTest) => ({
                      id: fitnessTest,
                      name: fitnessTest,
                    }))}
                    onSelectChange={(selected) => {
                      atomFitnessTestChosen.set(selected);
                    }}
                    label="体测对比"
                    defaultSelected={fitnessTestChosen ?? undefined}
                  />
                </div>
              </div>
            </div>

            {/* Cards */}
            {!data && (
              <div className="flex items-center justify-center py-24 px-12 w-full overflow-hidden bg-white dark:bg-gray-800 shadow-xs">
                加载中 ...
              </div>
            )}
            {data && (
              <div className="grid grid-cols-12 gap-6">
                <SingleSchoolTotalParticipationCard />
                <SingleSchoolTotalGradeCard />
                <SingleSchoolTotalScoreCard />
                <SingleSchoolTotalYearParticipationCard />
                <SingleSchoolTotalYearPassingRateCard />
                {FRONTEND_EXERCISE_TYPES.map((type) => {
                  return <SingleClassDetailGradeBarCard key={type} type={type} />;
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
