import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT } from "~/lib/const";
import { cn, mapYearToChineseFrontend } from "~/lib/utils";
import { useAllSchoolData } from "~/states/schoolData";
import { queryClient } from "~/utils/QueryClient";
import { fileRouterClient } from "~/utils/routerClient";

export default function UploadStudentInfoDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const allSchoolData = useAllSchoolData().data?.data ?? {};
  const [request, setRequest] = useState<{
    file: File | undefined;
    from: string;
    to: string;
    yearsAndClassesToProcess: Record<string, string[]>;
  }>({
    file: undefined,
    from: "",
    to: "",
    yearsAndClassesToProcess: {},
  });

  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [yearAndClassScanned, setYearAndClassScanned] = useState<
    Record<string, Record<string, number>>
  >({});
  const [overlappingYearsAndClasses, setOverlappingYearsAndClasses] = useState<
    Record<string, string[]>
  >({});
  const [missingStudentsInfo, setMissingStudentsInfo] = useState(false);
  const [messages, setMessages] = useState<
    {
      severity: "error" | "warning";
      message: string;
      type?: string;
    }[]
  >([]);
  const [duplicatedInternalIds, setDuplicatedInternalIds] = useState<string[]>([]);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
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
        setMissingStudentsInfo(false);
        setOverlappingYearsAndClasses({});
        setYearAndClassScanned({});
        return;
      }
      try {
        const arrayBuffer = await request.file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw_data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        for (let i = 0; i < raw_data[0].length; i++) {
          if (EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT[i] !== raw_data[0][i]) {
            setFileError(
              `文件格式错误，请确认格式为如下\n${EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT.join(
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
        // class, total, noscores
        const r: Record<string, Record<string, number>> = {};
        const overlappingYearsAndClasses: Record<string, string[]> = {};
        const defaultSelectedYearsAndClasses: Record<string, string[]> = {};
        const namesSet = new Set<string>();
        const internalIdsSet = new Set<string>();
        const duplicatedNames = new Set<string>();
        const duplicatedInternalIds = new Set<string>();
        const msg: {
          severity: "error" | "warning";
          message: string;
        }[] = [];
        for (let i = 1; i < raw_data.length; i++) {
          if (raw_data[i].length <= 1) continue; // complete blank
          const year = mapYearToChineseFrontend(raw_data[i][0]);
          const class_ = raw_data[i][1];
          const name = raw_data[i][2];
          const gender = raw_data[i][3];
          const internalId = raw_data[i][4];
          const idNumber = raw_data[i][5]; // not used
          if (!year || !class_ || !name || !gender || !internalId) {
            setMissingStudentsInfo(true);
            msg.push({
              severity: "error",
              message: "有学生信息缺失，请检查文件",
            });
            break;
          }
          if (!r[year]) {
            r[year] = {};
          }
          if (!r[year][class_]) {
            r[year][class_] = 0;
          }
          r[year][class_]++;
          if (allSchoolData[year] && allSchoolData[year].some(([class2]) => class2 === class_)) {
            if (!overlappingYearsAndClasses[year]) {
              overlappingYearsAndClasses[year] = [];
            }
            overlappingYearsAndClasses[year].push(class_);
          } else {
            if (!defaultSelectedYearsAndClasses[year]) {
              defaultSelectedYearsAndClasses[year] = [];
            }
            defaultSelectedYearsAndClasses[year].push(class_);
          }

          if (namesSet.has(name)) {
            duplicatedNames.add(name);
          }
          namesSet.add(name);
          if (internalIdsSet.has(internalId)) {
            duplicatedInternalIds.add(internalId);
          }
          internalIdsSet.add(internalId);
        }

        for (const year in overlappingYearsAndClasses) {
          overlappingYearsAndClasses[year] = [...new Set(overlappingYearsAndClasses[year])];
        }

        for (const year in defaultSelectedYearsAndClasses) {
          defaultSelectedYearsAndClasses[year] = [...new Set(defaultSelectedYearsAndClasses[year])];
        }

        if (Object.keys(overlappingYearsAndClasses).length > 0) {
          msg.push({
            severity: "error",
            message:
              "以下班级已经上传过学生信息，无法再次上传！\n" +
              Object.keys(overlappingYearsAndClasses)
                .map((year) => year + ": " + overlappingYearsAndClasses[year].join(", "))
                .join("\n"),
          });
        }

        if (duplicatedNames.size > 0) {
          msg.push({
            severity: "warning",
            message:
              "以下学生姓名重复，请确认是否正确（确认正确后可以上传）：\n" +
              Array.from(duplicatedNames).join(", "),
          });
        }
        if (duplicatedInternalIds.size > 0) {
          msg.push({
            severity: "error",
            message:
              "以下学生学号重复，请检查文件：\n" + Array.from(duplicatedInternalIds).join(", "),
          });
        }

        setMessages(msg);
        setDuplicateNames(Array.from(duplicatedNames));
        setDuplicatedInternalIds(Array.from(duplicatedInternalIds));
        setYearAndClassScanned(r);
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
        setOverlappingYearsAndClasses({});
        setMissingStudentsInfo(false);
        setDuplicateNames([]);
        setDuplicatedInternalIds([]);
      }
    })();
  }, [request.file]);

  useEffect(() => {
    if (!request.from || !request.to || request.from === "" || request.to === "") return;
    const messagesNew: {
      severity: "error" | "warning";
      message: string;
    }[] = [];
    try {
      if (isNaN(parseInt(request.from)) || isNaN(parseInt(request.to))) {
        messagesNew.push({
          severity: "error",
          message: "系统错误，请重新刷新页面后重试",
        });
      }
      const from = parseInt(request.from);
      const to = parseInt(request.to);
      if (from > to) {
        messagesNew.push({
          severity: "error",
          message: "学期开始年份不能大于结束年份",
        });
      }
      if (to < new Date().getFullYear()) {
        messagesNew.push({
          severity: "error",
          message: "无法上传过去学期的学生信息",
        });
      }
      if (to - from > 1) {
        messagesNew.push({
          severity: "error",
          message: "学期不能超过1年",
        });
      }
      if (to === from) {
        messagesNew.push({
          severity: "error",
          message: "学期开始和结束不能相同",
        });
      }
      if (to > new Date().getFullYear() + 1) {
        messagesNew.push({
          severity: "warning",
          message: `学期在${from} - ${to}年，请确认是否正确`,
        });
      }
    } catch (error) {
      console.error(error);
      messagesNew.push({
        severity: "error",
        message: "系统错误，请重新刷新页面后重试",
      });
    }
    setInputMessages(messagesNew);
  }, [request.from, request.to]);

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
            className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-[95vw] lg:w-[85vw] xl:w-[70vw] sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-none rounded-xl">
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 ml-auto mb-3"
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
                      输入学期 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-row gap-2 items-center">
                      <input
                        className="form-input flex-1 placeholder:italic max-w-[160px]"
                        type="number"
                        placeholder={`例：${new Date().getFullYear()}`}
                        value={request.from}
                        onChange={(e) => {
                          const t = parseInt(e.target.value);
                          if (isNaN(t)) return;
                          setRequest({
                            ...request,
                            from: t.toString(),
                          });
                        }}
                      />
                      年 -
                      <input
                        className="form-input flex-1 placeholder:italic max-w-[160px]"
                        type="number"
                        placeholder={`例：${new Date().getFullYear() + 1}`}
                        value={request.to}
                        onChange={(e) => {
                          const t = parseInt(e.target.value);
                          if (isNaN(t)) return;
                          setRequest({
                            ...request,
                            to: t.toString(),
                          });
                        }}
                      />
                      年
                    </div>
                  </div>
                </div>
                {request.from &&
                  request.to &&
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
                  request.from &&
                  request.to &&
                  inputMessages.filter((message) => message.severity === "error").length === 0 && (
                    <p className="text-xs font-medium text-red-500 whitespace-pre-line">
                      {fileError}
                    </p>
                  )}
                {request.file &&
                  inputMessages.filter((message) => message.severity === "error").length === 0 && (
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
                          setYearAndClassScanned({});
                          setOverlappingYearsAndClasses({});
                          setDuplicateNames([]);
                          setDuplicatedInternalIds([]);
                          setMissingStudentsInfo(false);
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
                      <div className="flex flex-col gap-4">
                        {Object.keys(yearAndClassScanned).map((year) => (
                          <div key={year} className="">
                            <div className="text-sm font-medium mb-1">{year}</div>
                            <div className="flex flex-row flex-wrap gap-3 gap-y-1">
                              {Object.keys(yearAndClassScanned[year]).map((class_) => (
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
                      request.from === undefined ||
                      request.to === undefined ||
                      messages.filter((message) => message.severity === "error").length > 0 ||
                      inputMessages.filter((message) => message.severity === "error").length > 0 ||
                      submitting
                    }
                    className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (
                        !request.file ||
                        submitting ||
                        request.from === undefined ||
                        request.to === undefined
                      ) {
                        return;
                      }
                      try {
                        setSubmitting(true);
                        setSubmitError(undefined);
                        const response = await fileRouterClient.api.files.studentInfo.upload.$post({
                          form: {
                            file: request.file,
                            from: request.from.toString(),
                            to: request.to.toString(),
                          },
                        });
                        const d = await response.json();
                        if (!response.ok || !d.data) {
                          setSubmitError((d as any).message ?? "系统错误");
                        } else {
                          queryClient.invalidateQueries({
                            queryKey: ["session", "fileProcesses"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["session", "allSchoolData"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["session", "queryableSchoolData"],
                          });
                          setRequest({
                            file: undefined,
                            from: "",
                            to: "",
                            yearsAndClassesToProcess: {},
                          });
                          setMessages([]);
                          setInputMessages([]);
                          setYearAndClassScanned({});
                          setOverlappingYearsAndClasses({});
                          setDuplicateNames([]);
                          setDuplicatedInternalIds([]);
                          setMissingStudentsInfo(false);
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
                        {" "}
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
