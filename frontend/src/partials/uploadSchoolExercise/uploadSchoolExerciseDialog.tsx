import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Calendar } from "~/components/ui/calendar";
import { PopoverContent, PopoverTrigger, Popover } from "~/components/ui/popover";
import { EXPECTED_HEADERS_FROM_DAWEI_EXPORT_FRONTEND } from "~/lib/const";
import { cn, mapYearToChineseFrontend } from "~/lib/utils";
import { fileRouterClient } from "~/utils/routerClient";

export default function uploadSchoolExerciseDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [request, setRequest] = useState<{
    file: File | undefined;
    exerciseDate: Date | undefined;
  }>({
    file: undefined,
    exerciseDate: new Date(Date.now()),
  });

  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<
    {
      severity: "error" | "warning";
      message: string;
    }[]
  >([]);

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
              `文件格式错误，请确认格式为如下\n${EXPECTED_HEADERS_FROM_DAWEI_EXPORT_FRONTEND.join(
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
      } catch (error) {
        console.error(error);
        setFileError("网页错误，请刷新页面后重试");
        setRequest({
          ...request,
          file: undefined,
        });
        setMessages([]);
      }
    })();
  }, [request.file]);

  return (
    <Dialog open={open} onClose={setOpen} className="relative z-[99]">
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
                <div className="text-gray-800 dark:text-gray-200 font-semibold">
                  <span className="text-red-500">*</span>
                  系统无法识别重复记录，请整理好后上传
                </div>
                <div className="flex items-start gap-4 gap-y-4">
                  <div className="flex flex-col flex-1">
                    <label className="block text-sm font-medium mb-1">
                      体锻日期 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-row gap-2 items-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              "btn px-2.5 min-w-[15.5rem] bg-white border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-left justify-start",
                              !request.exerciseDate && "text-muted-foreground"
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
                            {request.exerciseDate ? (
                              format(request.exerciseDate, "LLL dd, y")
                            ) : (
                              <span>选择日期</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[999]" align="start">
                          <Calendar
                            mode="single"
                            classNames={{
                              selected:
                                "rounded-md bg-violet-500 text-white hover:bg-violet-500 hover:text-white focus:bg-violet-500 focus:text-white",
                            }}
                            defaultMonth={request.exerciseDate}
                            selected={request.exerciseDate}
                            onSelect={(date: Date | undefined) =>
                              setRequest({ ...request, exerciseDate: date })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <div
                  {...dropzone.getRootProps()}
                  className={cn(
                    "flex justify-center items-center w-full h-32 border-dashed border-2 border-gray-200 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all select-none cursor-pointer min-h-[150px]"
                  )}
                >
                  <input {...dropzone.getInputProps()} />

                  <div className="font-medium text-sm">- 拖拽文件到此处或点击上传 -</div>
                </div>
                {fileError && (
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
                          exerciseDate: new Date(Date.now()),
                        });
                        setMessages([]);
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
                {messages.map((message, index) => (
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
              </div>
              {/* htmlForm footer */}
              <div className="mt-6">
                <div className="mb-4">
                  <button
                    disabled={
                      request.file === undefined ||
                      request.exerciseDate === undefined ||
                      messages.filter((message) => message.severity === "error").length > 0 ||
                      submitting
                    }
                    className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (
                        request.file === undefined ||
                        request.exerciseDate === undefined ||
                        messages.filter((message) => message.severity === "error").length > 0 ||
                        submitting
                      ) {
                        return;
                      }
                      try {
                        setSubmitting(true);
                        setSubmitError(undefined);
                        const response =
                          await fileRouterClient.api.files.schoolExercise.upload.$post({
                            form: {
                              file: request.file,
                              exerciseDate: request.exerciseDate.toString(),
                            },
                          });
                        const d = await response.json();
                        if (!response.ok || !d.data) {
                          setSubmitError((d as any).message ?? "系统错误");
                        } else {
                          setRequest({
                            file: undefined,
                            exerciseDate: new Date(Date.now()),
                          });
                          setMessages([]);
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
