import { useHomeExerciseRecords } from "~/states/homeExerciseRecords";
import UploadHomeExerciseTableItem from "./HomeExerciseTableItem";

function HomeExerciseTable() {
  const data =
    useHomeExerciseRecords().data?.data.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl relative">
      <header className="px-5 py-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          体锻记录{" "}
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
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">项目</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">姓名</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">运动成绩</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">运动耗时</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">成绩等级</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">年级</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">班级</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">日期</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">操作</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            {data.length > 0 &&
              data.map((process) => {
                return <UploadHomeExerciseTableItem key={process.recordId} {...process} />;
              })}
          </table>
          {data.length === 0 && <div className="text-center p-4 py-8">暂时没有任何记录</div>}
        </div>
      </div>
    </div>
  );
}

export default HomeExerciseTable;
