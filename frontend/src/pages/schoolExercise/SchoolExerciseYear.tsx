import { useMemo, useState } from "react";

import { format } from "date-fns";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import Header from "~/partials/Header";
import SingleClassTotalParticipationCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard01";
import Sidebar from "~/partials/Sidebar";
import { cn, getPermission } from "~/lib/utils";
import SingleClassOnlyParticipationLineCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard02";
import SingleSelect from "~/components/SingleSelect";
import SingleClassAnyExerciseCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard03";
import SingleClassOverallDurationBarCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard02-1";
import SingleClassOverallDurationDonutCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard02-2";
import SingleYearOverallDurationBarCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard01-1";
import SingleYearOverallParticipationBarCard from "~/partials/schoolExerciseYear/SchoolExerciseClassCard01-2";
import { authClient } from "~/utils/betterAuthClient";
import PageNotFound from "~/pages/utility/PageNotFound";

const yearData = [
  {
    id: 444,
    name: "三年级",
  },
  {
    id: 445,
    name: "四年级",
  },
];

const yearSelected = {
  id: 444,
  name: "三年级",
};

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // TODO : date logic wiht buttons, set default as 1 week
  const [date, setDate] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>(
    undefined
  );

  const { data: session } = authClient.useSession();
  const { canSeeWholeYear } = useMemo(() => getPermission(session), [session]);

  if (!canSeeWholeYear) {
    return <PageNotFound />;
  }

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
                  年级成绩 - {yearSelected.name}
                </h1>
              </div>
            </div>

            <div className="sm:flex sm:justify-between sm:items-center mb-5">
              {/* Right side */}
              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-between gap-2 w-full">
                {/* Dropdown */}
                {/* TODO: bind events to global state */}
                <div className="flex gap-3 flex-wrap gap-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "btn px-2.5 min-w-[15.5rem] bg-white border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-left justify-start",
                          !date && "text-muted-foreground"
                        )}
                      >
                        {/* <CalendarIcon /> */}
                        <svg
                          className="fill-current text-gray-400 dark:text-gray-500 ml-1 mr-2"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                        >
                          <path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z"></path>
                          <path d="M4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4ZM2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z"></path>
                        </svg>
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>选择日期</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[999]" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(date) => {
                          setDate(date);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <button className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">
                    7天
                  </button>
                  <button className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">
                    14天
                  </button>
                  <button className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300">
                    30天
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SingleSelect
                    options={yearData}
                    onSelectChange={() => {}}
                    defaultLabel="选择年级"
                    defaultSelected={444}
                    className="min-w-32"
                  />
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-12 gap-6">
              <SingleClassTotalParticipationCard />
              <SingleClassOnlyParticipationLineCard />
              <SingleYearOverallDurationBarCard />
              <SingleYearOverallParticipationBarCard />
              <SingleClassOverallDurationBarCard />
              <SingleClassOverallDurationDonutCard />
              <SingleClassAnyExerciseCard />
              <SingleClassAnyExerciseCard />
              <SingleClassAnyExerciseCard />
              <SingleClassAnyExerciseCard />
              <SingleClassAnyExerciseCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
