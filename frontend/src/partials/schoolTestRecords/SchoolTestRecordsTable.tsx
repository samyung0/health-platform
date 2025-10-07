import { useState } from "react";
import UploadSchoolTestRecordsTableItem from "./SchoolTestRecordsTableItem";
import { useAllSchoolTestRecords } from "~/states/schoolTestRecords";

const Item = ({
  onClick,
  isActive,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) => {
  return (
    <li>
      <button
        className={
          isActive
            ? "inline-flex items-center justify-center rounded-l-lg leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-violet-500"
            : "inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300"
        }
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  );
};
const Ellipsis = () => {
  return (
    <li>
      <span className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500">
        …
      </span>
    </li>
  );
};
function SchoolTestRecordsTable() {
  const data =
    useAllSchoolTestRecords().data?.data.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) ?? [];

  const totalPages = Math.ceil(data.length / 100);
  const [page, setPage] = useState(0);
  const [start, end] = [page * 100, (page + 1) * 100];

  const pages: React.ReactNode[] = [];
  if (totalPages <= 6) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Item onClick={() => setPage(i)} isActive={i === page}>
          {i}
        </Item>
      );
    }
  } else {
    for (let i = 1; i <= 2; i++) {
      pages.push(
        <Item onClick={() => setPage(i)} isActive={i === page}>
          {i}
        </Item>
      );
    }
    if (2 < page && page < totalPages - 1) {
      pages.push(<Ellipsis />);
      pages.push(
        <Item onClick={() => setPage(page)} isActive={true}>
          {page}
        </Item>
      );
    }
    pages.push(<Ellipsis />);
    for (let i = totalPages - 1; i <= totalPages; i++) {
      pages.push(
        <Item onClick={() => setPage(i)} isActive={i === page}>
          {i}
        </Item>
      );
    }
  }

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
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">体测</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">姓名</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">项目</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">体测成绩</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">成绩等级</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">年级</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">班级</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">日期</div>
                </th>
                <th className="px-1 first:pl-5 last:pr-3 whitespace-nowrap">
                  <div className="font-semibold text-left">操作</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            {data.length > 0 &&
              data.slice(start, end).map((d) => {
                if (d.recordType === "身高" || d.recordType === "体重") return null;
                return <UploadSchoolTestRecordsTableItem key={d.recordId} {...d} />;
              })}
          </table>
          {data.length === 0 && <div className="text-center p-4 pt-12">暂时没有任何记录</div>}
          <div className="flex justify-center pt-6 pb-12">
            <nav className="flex" role="navigation" aria-label="Navigation">
              <div className="mr-2">
                <button
                  className={
                    page > 0
                      ? "inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-violet-500 shadow-xs"
                      : "inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-300 dark:text-gray-600"
                  }
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 0}
                >
                  <span className="sr-only">Previous</span>
                  <wbr />
                  <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M9.4 13.4l1.4-1.4-4-4 4-4-1.4-1.4L4 8z" />
                  </svg>
                </button>
              </div>
              <ul className="inline-flex text-sm font-medium -space-x-px rounded-lg shadow-xs">
                {pages}
              </ul>
              <div className="ml-2">
                <button
                  className={
                    page < totalPages
                      ? "inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700/60 text-violet-500 shadow-xs"
                      : "inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-300 dark:text-gray-600"
                  }
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <span className="sr-only">Next</span>
                  <wbr />
                  <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z" />
                  </svg>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchoolTestRecordsTable;
