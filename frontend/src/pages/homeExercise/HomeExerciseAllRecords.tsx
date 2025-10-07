import { useState } from "react";

import Sidebar from "../../partials/Sidebar";
import Header from "../../partials/Header";
import HomeExerciseTable from "~/partials/homeExerciseRecord/HomeExerciseTable";
import HomeExerciseDialog from "~/partials/homeExerciseRecord/HomeExerciseDialog";
import { useHomeExerciseRecords } from "~/states/homeExerciseRecords";

function HomeExerciseAllRecords() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openUploadHomeExercise, setOpenUploadHomeExercise] = useState(false);
  const data = useHomeExerciseRecords().data;
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
            {/* Page header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              {/* Left: Title */}
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                  校外体锻数据
                </h1>
              </div>

              {/* Right: Actions */}
              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                <button
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                  onClick={() => setOpenUploadHomeExercise(true)}
                >
                  <svg
                    className="fill-current shrink-0 xs:hidden"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                  >
                    <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                  </svg>
                  <span className="max-xs:sr-only">上传体锻记录</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {!data && (
              <div className="flex items-center justify-center py-24 px-12 w-full overflow-hidden bg-white dark:bg-gray-800 shadow-xs">
                加载中 ...
              </div>
            )}
            {data && <HomeExerciseTable />}
            <HomeExerciseDialog open={openUploadHomeExercise} setOpen={setOpenUploadHomeExercise} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default HomeExerciseAllRecords;
