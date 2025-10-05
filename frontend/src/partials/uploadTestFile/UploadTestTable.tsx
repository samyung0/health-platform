import UploadTestTableItem from "./UploadTestTableItem";

import { useFileProcesses } from "~/states/fileProcess";

function UploadTestTable() {
  const data = useFileProcesses().data?.data ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl relative">
      <header className="px-5 py-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          上传记录{" "}
          <span className="text-gray-400 dark:text-gray-500 font-medium">{data.length}</span>
        </h2>
      </header>
      <div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-auto w-full dark:text-gray-300 divide-y divide-gray-100 dark:divide-gray-700/60">
            {/* Table header */}
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700/60">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">上传日期</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">文件名</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">文件类别</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">处理进度</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">系统信息</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            {data.length > 0 &&
              data.map((process) => {
                return <UploadTestTableItem key={process.fileProcessId} {...process} />;
              })}
          </table>
          {data.length === 0 && <div className="text-center p-4 py-8">暂时没有任何记录</div>}
        </div>
      </div>
    </div>
  );
}

export default UploadTestTable;
