import { useState } from "react";

import Sidebar from "../../partials/Sidebar";
import Header from "../../partials/Header";
import ExportTestReportDialog from "~/partials/exportTestReport/ExportTestReportDialog";
import ExportAllDataDialog from "~/partials/exportTestReport/ExportAllDataDialog";

function ExportFile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openExportTestFile, setOpenExportTestFile] = useState(false);
  const [openExportAllData, setOpenExportAllData] = useState(false);
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
                  导出文件
                </h1>
              </div>

              {/* Right: Actions */}
              {/* <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                <button
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                  onClick={() => setOpenSchoolTest(true)}
                >
                  <svg
                    className="fill-current shrink-0 xs:hidden"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                  >
                    <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                  </svg>
                  <span className="max-xs:sr-only">导出体测报告</span>
                </button>
              </div> */}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl relative flex justify-center items-start px-5 py-12 gap-4">
              <button
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                onClick={() => setOpenExportTestFile(true)}
              >
                <svg
                  className="fill-current shrink-0 xs:hidden"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                </svg>
                <span className="max-xs:sr-only">导出体测报告</span>
              </button>

              <button
                className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                onClick={() => setOpenExportAllData(true)}
              >
                <svg
                  className="fill-current shrink-0 xs:hidden"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                </svg>
                <span className="max-xs:sr-only">导出原始数据</span>
              </button>
            </div>

            <ExportTestReportDialog open={openExportTestFile} setOpen={setOpenExportTestFile} />
            <ExportAllDataDialog open={openExportAllData} setOpen={setOpenExportAllData} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default ExportFile;
