import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import SingleSelect from "~/components/SingleSelect";
import { EXPECTED_HEADERS_FROM_DAWEI_EXPORT_FRONTEND } from "~/lib/const";
import { cn, mapYearToChineseFrontend } from "~/lib/utils";
import { useAllSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { queryClient } from "~/utils/QueryClient";
import { fileRouterClient } from "~/utils/routerClient";

export default function UploadFileDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const testData = useSchoolTests().data?.data ?? [];
  const allSchoolData = useAllSchoolData().data?.data ?? {};
  const [request, setRequest] = useState<{
    file: File | undefined;
    testDate: Date | undefined;
    yearsAndClassesToProcess: Record<string, string[]>;
    testName: string | undefined;
    newTestName: string;
    isCreateNewTest: boolean;
    isRedoOrMissingUpload: boolean;
  }>({
    file: undefined,
    testDate: undefined,
    yearsAndClassesToProcess: {},
    testName: undefined,
    newTestName: "",
    isCreateNewTest: false,
    isRedoOrMissingUpload: false,
  });

  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [testTypeScanned, setTestTypeScanned] = useState<string[]>([]);
  const [yearAndClassScanned, setYearAndClassScanned] = useState<Record<string, string[]>>({});
  const [overlappingYearsAndClasses, setOverlappingYearsAndClasses] = useState<
    Record<string, string[]>
  >({});
  const [missingStudentsInYearsAndClasses, setMissingStudentsInYearsAndClasses] = useState<
    Record<string, Record<string, { reported: number; total: number }>>
  >({});
  const [mostlyBlankScoreStudentsInYearsAndClasses, setMostlyBlankScoreStudentsInYearsAndClasses] =
    useState<Record<string, Record<string, { total: number; noscores: number }>>>({});
  const [unrecognizedYearsAndClasses, setUnrecognizedYearsAndClasses] = useState<
    Record<string, string[]>
  >({});
  const [messages, setMessages] = useState<
    {
      severity: "error" | "warning";
      message: string;
    }[]
  >([]);
  const [inputMessages, setInputMessages] = useState<
    {
      severity: "error" | "warning";
      message: string;
    }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const dropzone = useDropzone({
    onDropRejected: (fileRejections) => {
      setFileError(
        fileRejections[0].errors[0].code === "too-many-files"
          ? "文件数量超过限制 (1)"
          : fileRejections[0].errors[0].code === "file-invalid-type"
          ? "文件类型不支持 (xlsx, xls, xltx, xlt, csv)"
          : "文件大小超过限制 (10MB)"
      );
    },
    onDropAccepted: (acceptedFiles) => {
      setMessages([]);
      setYearAndClassScanned({});
      setTestTypeScanned([]);
      setMissingStudentsInYearsAndClasses({});
      setMostlyBlankScoreStudentsInYearsAndClasses({});
      setOverlappingYearsAndClasses({});
      setUnrecognizedYearsAndClasses({});
      setSubmitError(undefined);
      setFileError(undefined);
      setRequest({
        ...request,
        file: acceptedFiles[0],
      });
    },
    maxSize: 1024 * 1024 * 10,
    maxFiles: 1,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
        ".xls",
        ".xltx",
        ".xlt",
      ],
      "text/csv": [".csv"],
    },
  });

  useEffect(() => {
    (async () => {
      if (!request.file) {
        setMessages([]);
        setYearAndClassScanned({});
        setTestTypeScanned([]);
        setMissingStudentsInYearsAndClasses({});
        setMostlyBlankScoreStudentsInYearsAndClasses({});
        setOverlappingYearsAndClasses({});
        return;
      }
      try {
        const arrayBuffer = await request.file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw_data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        for (let i = 0; i < raw_data[0].length; i++) {
          if (EXPECTED_HEADERS_FROM_DAWEI_EXPORT_FRONTEND[i] !== raw_data[0][i]) {
            setFileError(
              `文件格式错误，请重新在大沩平台导出并上传\n${EXPECTED_HEADERS_FROM_DAWEI_EXPORT_FRONTEND.join(
                ", "
              )}`
            );
            setRequest({
              ...request,
              file: undefined,
            });
            return;
          }
        }
        setTestTypeScanned(raw_data[0].slice(9));
        // class, total, noscores
        const r: Record<string, Record<string, { total: number; noscores: number }>> = {};
        const r2: Record<string, string[]> = {};
        const overlappingYearsAndClasses: Record<string, string[]> = {};
        const missingStudentsInYearsAndClasses: Record<
          string,
          Record<string, { reported: number; total: number }>
        > = {};
        const mostlyBlankScoreStudentsInYearsAndClasses: Record<
          string,
          Record<string, { total: number; noscores: number }>
        > = {};
        const defaultSelectedYearsAndClasses: Record<string, string[]> = {};
        for (let i = 1; i < raw_data.length; i++) {
          if (raw_data[i].length <= 1) continue; // complete blank
          const class_ = raw_data[i][2].slice(3);
          const year = mapYearToChineseFrontend(raw_data[i][2].slice(0, 3));
          if (!r[year]) {
            r[year] = {};
            r2[year] = [];
          }
          if (!r[year][class_]) {
            r[year][class_] = { total: 0, noscores: 0 };
            r2[year].push(class_);
          }
          r[year][class_].total++;
          if (raw_data[i].length <= 7) {
            r[year][class_].noscores++;
          }
          if (!request.isCreateNewTest) {
            const test = testData.find((test) => test.name === request.testName);
            if (
              request.isRedoOrMissingUpload &&
              test!.redoOrMissingUploadYearsAndClassesProcessed[year] &&
              test!.redoOrMissingUploadYearsAndClassesProcessed[year].includes(class_)
            ) {
              if (!overlappingYearsAndClasses[year]) {
                overlappingYearsAndClasses[year] = [];
              }
              overlappingYearsAndClasses[year].push(class_);
              continue;
            }
            if (
              !request.isRedoOrMissingUpload &&
              test!.mainUploadYearsAndClassesProcessed[year] &&
              test!.mainUploadYearsAndClassesProcessed[year].includes(class_)
            ) {
              if (!overlappingYearsAndClasses[year]) {
                overlappingYearsAndClasses[year] = [];
              }
              overlappingYearsAndClasses[year].push(class_);
              continue;
            }
          }
        }
        for (const year in r) {
          for (const class_ in r[year]) {
            if (r[year][class_].noscores > 0.5 * r[year][class_].total) {
              if (!mostlyBlankScoreStudentsInYearsAndClasses[year]) {
                mostlyBlankScoreStudentsInYearsAndClasses[year] = {};
              }
              mostlyBlankScoreStudentsInYearsAndClasses[year][class_] = {
                total: r[year][class_].total,
                noscores: r[year][class_].noscores,
              };
            } else {
              if (!defaultSelectedYearsAndClasses[year]) {
                defaultSelectedYearsAndClasses[year] = [];
              }
              defaultSelectedYearsAndClasses[year].push(class_);
            }
            if (
              !allSchoolData[year] ||
              !allSchoolData[year].some(([class2]) => class2 === class_)
            ) {
              if (!unrecognizedYearsAndClasses[year]) {
                unrecognizedYearsAndClasses[year] = [];
              }
              unrecognizedYearsAndClasses[year].push(class_);
              continue;
            }
            const total = allSchoolData[year].find(([class2]) => class2 === class_)![1];
            if (total !== r[year][class_].total) {
              if (!missingStudentsInYearsAndClasses[year]) {
                missingStudentsInYearsAndClasses[year] = {};
              }
              missingStudentsInYearsAndClasses[year][class_] = {
                reported: r[year][class_].total,
                total: total,
              };
            }
          }
        }

        for (const year in overlappingYearsAndClasses) {
          overlappingYearsAndClasses[year] = [...new Set(overlappingYearsAndClasses[year])];
        }

        const msg: {
          severity: "error" | "warning";
          message: string;
        }[] = [];

        if (Object.keys(missingStudentsInYearsAndClasses).length > 0) {
          msg.push({
            severity: "error",
            message:
              "以下班级缺少学生数据，请一次过上传班级全部的资料（没有参与体测的请上传空白记录）（上传，总）\n" +
              Object.keys(missingStudentsInYearsAndClasses)
                .map(
                  (year) =>
                    year +
                    ": " +
                    Object.entries(missingStudentsInYearsAndClasses[year])
                      .map(([class_, { reported, total }]) => `${class_}: ${reported},${total}`)
                      .join(" , ")
                )
                .join("\n"),
          });
        }

        if (Object.keys(mostlyBlankScoreStudentsInYearsAndClasses).length > 0) {
          msg.push({
            severity: "warning",
            message:
              "以下班级大部分学生的成绩为空白，请避免上传这些班级（空白，总）:\n" +
              Object.keys(mostlyBlankScoreStudentsInYearsAndClasses)
                .map(
                  (year) =>
                    year +
                    ": " +
                    Object.entries(mostlyBlankScoreStudentsInYearsAndClasses[year])
                      .map(([class_, { total, noscores }]) => `${class_}: ${noscores},${total}`)
                      .join(" , ")
                )
                .join("\n"),
          });
        }

        if (Object.keys(overlappingYearsAndClasses).length > 0) {
          msg.push({
            severity: "warning",
            message:
              "以下班级已经上传过主测数据，再次上传将会覆盖原有数据！（确认后可以上传）\n" +
              Object.keys(overlappingYearsAndClasses)
                .map((year) => year + ": " + overlappingYearsAndClasses[year].join(", "))
                .join("\n"),
          });
        }

        if (Object.keys(unrecognizedYearsAndClasses).length > 0) {
          msg.push({
            severity: "error",
            message:
              "以下班级未在数据库中找到，请检查班级信息是否正确:\n" +
              Object.keys(unrecognizedYearsAndClasses)
                .map((year) => year + ": " + unrecognizedYearsAndClasses[year].join(", "))
                .join("\n"),
          });
        }

        setMessages(msg);

        setYearAndClassScanned(r2);
        setUnrecognizedYearsAndClasses(unrecognizedYearsAndClasses);
        setMissingStudentsInYearsAndClasses(missingStudentsInYearsAndClasses);
        setMostlyBlankScoreStudentsInYearsAndClasses(mostlyBlankScoreStudentsInYearsAndClasses);
        setOverlappingYearsAndClasses(overlappingYearsAndClasses);

        setRequest({
          ...request,
          yearsAndClassesToProcess: defaultSelectedYearsAndClasses,
        });
      } catch (error) {
        console.error(error);
        setFileError("网页错误，请刷新页面后重试");
        setRequest({
          ...request,
          file: undefined,
          yearsAndClassesToProcess: {},
        });
        setYearAndClassScanned({});
        setMessages([]);
        setTestTypeScanned([]);
        setUnrecognizedYearsAndClasses({});
        setMissingStudentsInYearsAndClasses({});
        setMostlyBlankScoreStudentsInYearsAndClasses({});
        setOverlappingYearsAndClasses({});
      }
    })();
  }, [request.file]);

  useEffect(() => {
    const messagesNew: {
      severity: "error" | "warning";
      message: string;
    }[] = [];
    if (request.isCreateNewTest && testData.find((test) => test.name === request.newTestName)) {
      messagesNew.push({
        severity: "error",
        message: "体测名字已存在，请重新输入",
      });
    }
    setInputMessages(messagesNew);
  }, [request.newTestName, request.isCreateNewTest]);

  return (
    <Dialog open={open} onClose={setOpen} className="relative z-[9999]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-[95vw] lg:w-[85vw] xl:w-[70vw] sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] overflow-y-auto min-h-[550px]"
          >
            <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-none rounded-xl">
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 ml-auto mb-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                <div className="sr-only">Close</div>
                <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z" />
                </svg>
              </button>
              <div className="space-y-4">
                <div className="flex items-start gap-4 gap-y-4">
                  <div className="flex flex-col flex-1">
                    <label className="block text-sm font-medium mb-1">
                      选择体测 <span className="text-red-500">*</span>
                    </label>
                    <SingleSelect
                      options={[
                        {
                          id: "-1",
                          name: "创建新体测",
                        },
                        ...testData.map((test) => ({
                          id: test.id,
                          name: test.name,
                        })),
                      ]}
                      onSelectChange={(selected) => {
                        if (selected === "-1") {
                          setRequest({
                            ...request,
                            testName: undefined,
                            isCreateNewTest: true,
                            testDate: new Date(Date.now()),
                            file: undefined,
                          });

                          return;
                        }
                        const test = testData.find((test) => test.id === selected);
                        if (!test) {
                          return;
                        }
                        setRequest({
                          ...request,
                          testName: test.name,
                          isCreateNewTest: false,
                          testDate: new Date(test.fitnessTestDate),
                          file: undefined,
                        });
                      }}
                      defaultLabel="选择体测"
                      className="w-full"
                    />
                  </div>
                  {request.isCreateNewTest && (
                    <div className="flex flex-col flex-1">
                      <label className="block text-sm font-medium mb-1">
                        体测名字 <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="form-input flex-1 placeholder:italic"
                        type="text"
                        placeholder="例：2025年09月21日、2024年09月第一次体测 ..."
                        value={request.newTestName}
                        onChange={(e) => {
                          setRequest({
                            ...request,
                            newTestName: e.target.value,
                          });
                        }}
                      />
                    </div>
                  )}
                  {!request.isCreateNewTest && (
                    <div className="flex flex-col flex-1">
                      <label className="block text-sm font-medium mb-1">
                        主测/补测 <span className="text-red-500">*</span>
                      </label>
                      <SingleSelect
                        options={[
                          {
                            id: "1",
                            name: "主测",
                          },
                          {
                            id: "2",
                            name: "补测",
                          },
                        ]}
                        onSelectChange={(selected) => {
                          if (selected === "1") {
                            setRequest({
                              ...request,
                              isRedoOrMissingUpload: false,
                              file: undefined,
                            });
                          } else if (selected === "2") {
                            setRequest({
                              ...request,
                              isRedoOrMissingUpload: true,
                              file: undefined,
                            });
                          }
                        }}
                        defaultLabel="选择类型"
                        defaultSelected={request.isRedoOrMissingUpload ? "2" : "1"}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                {(request.testName || request.isCreateNewTest) &&
                  inputMessages.filter((message) => message.severity === "error").length === 0 && (
                    <div
                      {...dropzone.getRootProps()}
                      className={cn(
                        "flex justify-center items-center w-full h-32 border-dashed border-2 border-gray-200 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all select-none cursor-pointer min-h-[150px]"
                      )}
                    >
                      <input {...dropzone.getInputProps()} />

                      <div className="font-medium text-sm">- 拖拽文件到此处或点击上传 -</div>
                    </div>
                  )}
                {fileError &&
                  (request.testName || request.isCreateNewTest) &&
                  inputMessages.filter((message) => message.severity === "error").length === 0 && (
                    <p className="text-xs font-medium text-red-500 whitespace-pre-line">
                      {fileError}
                    </p>
                  )}
                {request.file && (
                  <div className="flex justify-between items-center flex-row w-full h-16 mt-2 px-4 border-solid border-2 border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center flex-row gap-4 h-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      </svg>
                      <div className="flex flex-col gap-0">
                        <div className="text-[0.85rem] font-medium leading-snug text-ellipsis overflow-hidden">
                          {request.file.name.split(".").slice(0, -1).join(".")}
                        </div>
                        <div className="text-[0.7rem] text-gray-500 leading-tight">
                          .{request.file.name.split(".").pop()} •{" "}
                          {(request.file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setRequest({
                          ...request,
                          file: undefined,
                          yearsAndClassesToProcess: {},
                        });
                        setMessages([]);
                        setTestTypeScanned([]);
                        setYearAndClassScanned({});
                        setUnrecognizedYearsAndClasses({});
                        setMissingStudentsInYearsAndClasses({});
                        setMostlyBlankScoreStudentsInYearsAndClasses({});
                        setOverlappingYearsAndClasses({});
                      }}
                      className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="stroke-red-500"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                )}
                {[...inputMessages, ...messages].map((message, index) => (
                  <div
                    className="inline-flex flex-col w-full px-4 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-400"
                    key={index}
                  >
                    <div className="flex w-full justify-between items-start">
                      <div className="flex">
                        <svg
                          className={cn(
                            "shrink-0 fill-current text-yellow-500 mt-[3px] mr-3",
                            message.severity === "error" ? "text-red-500" : "text-yellow-500"
                          )}
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                        </svg>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100 mb-1">
                            {message.severity === "error" ? "错误" : "警告"}
                          </div>
                          <div className="whitespace-pre-line">{message.message}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {request.file &&
                  [...inputMessages, ...messages].filter((message) => message.severity === "error")
                    .length === 0 && (
                    <div className="flex flex-col flex-1 p-4 px-6 rounded-lg text-sm bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700/60">
                      <label className="block text-sm font-medium mb-1">
                        选择要上传的班级 <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs -ml-2 mb-2">（已自动选择少空白记录的班级）</span>
                      <div className="flex flex-col gap-4">
                        {Object.keys(yearAndClassScanned).map((year) => (
                          <div key={year} className="">
                            <div className="text-sm font-medium mb-1">{year}</div>
                            <div className="flex flex-row flex-wrap gap-3 gap-y-1">
                              {yearAndClassScanned[year].map((class_) => (
                                <div className="" key={`${year}-${class_}`}>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox"
                                      checked={
                                        request.yearsAndClassesToProcess[year]?.includes(class_) ||
                                        false
                                      }
                                      onChange={(e) => {
                                        setRequest({
                                          ...request,
                                          yearsAndClassesToProcess: {
                                            ...request.yearsAndClassesToProcess,
                                            [year]: request.yearsAndClassesToProcess[
                                              year
                                            ]?.includes(class_)
                                              ? request.yearsAndClassesToProcess[year]?.filter(
                                                  (class2) => class2 !== class_
                                                )
                                              : [
                                                  ...(request.yearsAndClassesToProcess[year] || []),
                                                  class_,
                                                ],
                                          },
                                        });
                                      }}
                                    />
                                    <span className="text-sm ml-2">{year + "" + class_}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
              {/* htmlForm footer */}
              <div className="mt-6">
                <div className="mb-4">
                  <button
                    disabled={
                      request.file === undefined ||
                      (!request.isCreateNewTest && request.testName === undefined) ||
                      (request.isCreateNewTest && request.newTestName === "") ||
                      [...inputMessages, ...messages].filter(
                        (message) => message.severity === "error"
                      ).length > 0 ||
                      submitting
                    }
                    className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (
                        !request.file ||
                        submitting ||
                        [...inputMessages, ...messages].filter(
                          (message) => message.severity === "error"
                        ).length > 0
                      ) {
                        return;
                      }
                      try {
                        setSubmitting(true);
                        setSubmitError(undefined);
                        const response = await fileRouterClient.api.files.schoolTest.upload.$post({
                          form: {
                            file: request.file!,
                            testDate: request.testDate!.toString(),
                            yearsAndClassesToProcess: JSON.stringify(
                              request.yearsAndClassesToProcess
                            ),
                            testName: request.isCreateNewTest
                              ? request.newTestName
                              : request.testName!,
                            isCreateNewTest: request.isCreateNewTest.toString(),
                            isRedoOrMissingUpload: request.isRedoOrMissingUpload.toString(),
                          },
                        });
                        const d = await response.json();
                        if (!response.ok || !d.data) {
                          setSubmitError((d as any).message ?? "系统错误");
                        } else {
                          queryClient.invalidateQueries({ queryKey: ["session", "fileProcesses"] });
                          queryClient.invalidateQueries({ queryKey: ["session", "schoolTests"] });
                          setRequest({
                            file: undefined,
                            testDate: undefined,
                            yearsAndClassesToProcess: {},
                            testName: undefined,
                            newTestName: "",
                            isCreateNewTest: false,
                            isRedoOrMissingUpload: false,
                          });
                          setSubmitError(undefined);
                          setMessages([]);
                          setInputMessages([]);
                          setTestTypeScanned([]);
                          setYearAndClassScanned({});
                          setUnrecognizedYearsAndClasses({});
                          setMissingStudentsInYearsAndClasses({});
                          setMostlyBlankScoreStudentsInYearsAndClasses({});
                          setOverlappingYearsAndClasses({});
                          setOpen(false);
                        }
                      } catch (error) {
                        console.error(error);
                        setSubmitError("系统错误");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {submitting ? (
                      <>
                        <svg
                          className="animate-spin fill-current shrink-0"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                        </svg>
                        <span className="ml-2">上传中...</span>
                      </>
                    ) : (
                      "确定上传"
                    )}
                  </button>
                </div>
                <div className="text-xs font-medium -my-1 text-gray-500 text-center">
                  上传主测后可以再上传补测，导出时可以分开或合并导出。
                </div>
                {submitError && (
                  <div className="text-xs font-medium my-2 text-red-500 text-center">
                    {submitError}
                  </div>
                )}
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
