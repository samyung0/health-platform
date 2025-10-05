import { useState } from "react";
import type { FileProcessStatus } from "@/db/schema/enum";
import { fileRouterClient } from "../../utils/routerClient";
import type { InferResponseType } from "hono/client";

function UploadFileTableItem(
  props: InferResponseType<typeof fileRouterClient.api.files.myFileProcess.$get>["data"][number]
) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const statusColor = (status: FileProcessStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-700";
      case "processing":
        return "bg-yellow-500/20 text-yellow-700";
      case "failed":
        return "bg-red-500/20 text-red-700";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
    }
  };

  const displayType =
    props.fileProcessNature === "schoolTest"
      ? "体测"
      : props.fileProcessNature === "schoolExercise"
      ? "体锻"
      : props.fileProcessNature === "studentInfo"
      ? "学生信息"
      : "未知";
  const displayStatus =
    props.fileProcessStatus === "completed"
      ? "完成"
      : props.fileProcessStatus === "processing"
      ? "处理中"
      : props.fileProcessStatus === "failed"
      ? "失败"
      : props.fileProcessStatus === "pending"
      ? "待处理"
      : "未知";
  const errors = props.fileProcessMessages.filter((message) => message.severity === "error");
  const warnings = props.fileProcessMessages.filter((message) => message.severity === "warning");
  const infos = props.fileProcessMessages.filter((message) => message.severity === "info");
  const hasAnyMessages = errors.length > 0 || warnings.length > 0 || infos.length > 0;
  const displayMessagesSummary = (
    <div>
      {errors.length > 0 && <div className="text-red-500">{errors.length}个错误</div>}
      {warnings.length > 0 && <div className="text-yellow-500">{warnings.length}个警告</div>}
      {infos.length > 0 && <div>{infos.length}个信息</div>}
      {!hasAnyMessages && <div>无信息</div>}
    </div>
  );

  return (
    <tbody className="text-sm">
      {/* Row */}
      <tr>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{new Date(props.fileProcessRequestedAt).toDateString()}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="font-medium text-gray-800 dark:text-gray-100 max-w-[280px] text-ellipsis overflow-hidden">
            {props.originalFileName}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="font-medium text-gray-800 dark:text-gray-100">{displayType + "上传"}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div
            className={`inline-flex font-medium rounded-full text-center px-2.5 py-0.5 ${statusColor(
              props.fileProcessStatus
            )}`}
          >
            {displayStatus}
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="flex items-center">{displayMessagesSummary}</div>
        </td>
        {hasAnyMessages && (
          <td className="px-2 first:pl-5 last:pr-5 pb-0 whitespace-nowrap w-px">
            <div className="flex items-center">
              <button
                className={`text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 ${
                  descriptionOpen && "rotate-180"
                }`}
                aria-expanded={descriptionOpen}
                onClick={() => setDescriptionOpen(!descriptionOpen)}
                aria-controls={`description-${props.fileProcessId}`}
              >
                <span className="sr-only">Menu</span>
                <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                  <path d="M16 20l-5.4-5.4 1.4-1.4 4 4 4-4 1.4 1.4z" />
                </svg>
              </button>
            </div>
          </td>
        )}
      </tr>
      {/*
      Example of content revealing when clicking the button on the right side:
      Note that you must set a "colSpan" attribute on the <td> element,
      and it should match the number of columns in your table
      */}
      {hasAnyMessages && (
        <tr
          id={`description-${props.fileProcessId}`}
          role="region"
          className={`${!descriptionOpen && "hidden"}`}
        >
          <td colSpan={10} className="px-2 first:pl-5 last:pr-5 py-2">
            <div className="p-3 -mt-3 flex flex-col gap-3">
              {errors.length > 0 && (
                <ul>
                  <li className="font-medium text-red-500">错误:</li>
                  {errors.map((error, index) => (
                    <li key={index} className="whitespace-pre">
                      {error.message}
                    </li>
                  ))}
                </ul>
              )}
              {warnings.length > 0 && (
                <ul>
                  <li className="font-medium text-yellow-500">警告:</li>
                  {warnings.map((warning, index) => (
                    <li key={index} className="whitespace-pre">
                      {warning.message}
                    </li>
                  ))}
                </ul>
              )}
              {infos.length > 0 && (
                <ul>
                  <li className="font-medium">系统信息:</li>
                  {infos.map((info, index) => (
                    <li key={index} className="whitespace-pre">
                      {info.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </td>
        </tr>
      )}
    </tbody>
  );
}

export default UploadFileTableItem;
