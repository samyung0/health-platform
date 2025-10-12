import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import FileSaver from "file-saver";
import { useEffect, useMemo, useState } from "react";
import SingleSelect from "~/components/SingleSelect";
import { availableReportsToExport } from "~/lib/const";
import { cn, getPermission, getYearOrder } from "~/lib/utils";
import { useAllSchoolData, useQueryableSchoolData } from "~/states/schoolData";
import { useSchoolTests } from "~/states/schoolTest";
import { authClient } from "~/utils/betterAuthClient";
import { fileRouterClient } from "~/utils/routerClient";

export default function ExportTestReportDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { data: { data: testData } = { data: [] } } = useSchoolTests();
  const { data: { data: allSchoolData } = { data: {} } } = useAllSchoolData();
  const queryableYearsAndClasses = useQueryableSchoolData().data?.data ?? {};
  const [request, setRequest] = useState<{
    reportsToProcess: (typeof availableReportsToExport)[number] | null;
    year: string | null;
    class: string | null;
    entityId: string | null;
    schoolTestId: string | null;
    includeIsRedoOrMissingUpload: "主测" | "补测" | "全部";
  }>({
    reportsToProcess: null,
    year: null,
    class: null,
    entityId: null,
    schoolTestId: null,
    includeIsRedoOrMissingUpload: "全部",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const { data: session } = authClient.useSession();
  const [messages, setMessages] = useState<
    {
      severity: "error" | "warning";
      message: string;
    }[]
  >([]);

  const { canSeeWholeSchool, canSeeWholeYear, canSeeWholeClass, canSeeSelf } = useMemo(
    () => getPermission(session),
    [session]
  );
  const selectableReports = useMemo<(typeof availableReportsToExport)[number][]>(() => {
    if (canSeeWholeSchool) {
      return ["全校成绩总表", "年级成绩总表", "班级成绩总表", "班级排名统计表"];
    }
    if (canSeeWholeYear) {
      return ["年级成绩总表", "班级成绩总表"];
    }
    if (canSeeWholeClass) {
      return ["班级成绩总表"];
    }
    if (canSeeSelf) {
      return ["个人成绩单"];
    }
    return [];
  }, [canSeeWholeSchool, canSeeWholeYear, canSeeWholeClass, canSeeSelf]);

  const selectableYears = useMemo(
    () =>
      Object.keys(queryableYearsAndClasses).toSorted((a, b) => getYearOrder(a) - getYearOrder(b)),
    [queryableYearsAndClasses]
  );

  const selectableClasses = useMemo<string[]>(() => {
    if (!request.year || !queryableYearsAndClasses.hasOwnProperty(request.year)) {
      return [];
    }
    return queryableYearsAndClasses[request.year].toSorted((a, b) => {
      const numA = parseInt(a.split("班")[0]);
      const numB = parseInt(b.split("班")[0]);
      return numA - numB;
    });
  }, [queryableYearsAndClasses, request.year]);

  useEffect(() => {
    if (!request.schoolTestId) {
      setMessages([]);
      return;
    }
    const test = testData.find((test) => test.id === request.schoolTestId);
    if (!test) {
      setMessages([
        {
          severity: "error",
          message: "体测数据不存在",
        },
      ]);
      return;
    }
    const compare =
      request.includeIsRedoOrMissingUpload === "补测"
        ? test.redoOrMissingUploadYearsAndClassesProcessed
        : test.mainUploadYearsAndClassesProcessed;
    if (request.includeIsRedoOrMissingUpload === "全部") {
      for (const [year, classes] of Object.entries(
        test.redoOrMissingUploadYearsAndClassesProcessed
      )) {
        if (!compare[year]) {
          compare[year] = classes;
        } else {
          compare[year] = [...new Set([...compare[year], ...classes])];
        }
      }
    }

    if (request.year && !compare.hasOwnProperty(request.year)) {
      setMessages([
        {
          severity: "warning",
          message: `该年级还没有${test.name} - ${
            request.includeIsRedoOrMissingUpload === "补测"
              ? "补测"
              : request.includeIsRedoOrMissingUpload === "全部"
              ? "任何"
              : "主测"
          }数据，请确认是否要导出`,
        },
      ]);
      return;
    }

    if (request.year && request.class && !compare[request.year].includes(request.class)) {
      setMessages([
        {
          severity: "warning",
          message: `该班级还没有${test.name} - ${
            request.includeIsRedoOrMissingUpload === "补测"
              ? "补测"
              : request.includeIsRedoOrMissingUpload === "全部"
              ? "任何"
              : "主测"
          }数据，请确认是否要导出`,
        },
      ]);
      return;
    }
    setMessages([]);
  }, [request]);

  const canSelectYear =
    request.reportsToProcess === "年级成绩总表" || request.reportsToProcess === "班级成绩总表";
  const canSelectClass = request.reportsToProcess === "班级成绩总表";
  const canSelectEntity = request.reportsToProcess === "个人成绩单";

  // TODO: selectable entities

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
            className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-[95vw] lg:w-[85vw] xl:w-[70vw] sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] overflow-y-auto min-h-[550px]"
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
                      选择导出报告 <span className="text-red-500">*</span>
                    </label>
                    <SingleSelect
                      options={selectableReports.map((report) => ({
                        id: report,
                        name: report,
                      }))}
                      onSelectChange={(selected) => {
                        setRequest({
                          ...request,
                          reportsToProcess: selected,
                        });
                      }}
                      defaultLabel="选择导出报告"
                      className="w-full"
                      dropDownClassName="max-h-[250px] overflow-y-auto"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="block text-sm font-medium mb-1">
                      选择体测 <span className="text-red-500">*</span>
                    </label>
                    <SingleSelect
                      options={testData.map((test) => ({
                        id: test.id,
                        name: test.name,
                      }))}
                      onSelectChange={(selected) => {
                        setRequest({
                          ...request,
                          schoolTestId: selected,
                        });
                      }}
                      defaultLabel="选择体测"
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="block text-sm font-medium mb-1">
                      选择数据 <span className="text-red-500">*</span>
                    </label>
                    <SingleSelect
                      options={[
                        {
                          id: "all",
                          name: "全部",
                        },
                        {
                          id: "main",
                          name: "主测",
                        },
                        {
                          id: "redo",
                          name: "补测",
                        },
                      ]}
                      onSelectChange={(selected) => {
                        setRequest({
                          ...request,
                          includeIsRedoOrMissingUpload:
                            selected === "all" ? "全部" : selected === "main" ? "主测" : "补测",
                        });
                      }}
                      defaultLabel="选择数据"
                      defaultSelected="all"
                      className="w-full"
                    />
                  </div>
                </div>
                {(canSelectYear || canSelectClass || canSelectEntity) && (
                  <div className="flex items-start gap-4 gap-y-4">
                    {canSelectYear && (
                      <div className="flex flex-col flex-1">
                        <label className="block text-sm font-medium mb-1">
                          选择年级 <span className="text-red-500">*</span>
                        </label>
                        <SingleSelect
                          options={selectableYears
                            .toSorted((a, b) => getYearOrder(a) - getYearOrder(b))
                            .map((year) => ({
                              id: year,
                              name: year,
                            }))}
                          onSelectChange={(selected) => {
                            setRequest({
                              ...request,
                              year: selected,
                            });
                          }}
                          defaultLabel="选择年级"
                          className="w-full"
                          dropDownClassName="max-h-[250px] overflow-y-auto"
                        />
                      </div>
                    )}
                    {canSelectClass && request.year && (
                      <div className="flex flex-col flex-1">
                        <label className="block text-sm font-medium mb-1">
                          选择班级 <span className="text-red-500">*</span>
                        </label>
                        <SingleSelect
                          options={selectableClasses
                            .toSorted((a, b) => {
                              const numA = parseInt(a.split("班")[0]);
                              const numB = parseInt(b.split("班")[0]);
                              return numA - numB;
                            })
                            .map((class_) => ({
                              id: class_,
                              name: class_,
                            }))}
                          onSelectChange={(selected) => {
                            setRequest({
                              ...request,
                              class: selected,
                            });
                          }}
                          defaultLabel="选择班级"
                          className="w-full"
                          dropDownClassName="max-h-[250px] overflow-y-auto"
                        />
                      </div>
                    )}

                    {session && canSelectEntity && (
                      <div className="flex flex-col flex-1">
                        <label className="block text-sm font-medium mb-1">
                          选择学生 <span className="text-red-500">*</span>
                        </label>
                        <SingleSelect
                          options={
                            session.allClassifications[0].children.length > 0
                              ? session.allClassifications[0].children.map((child) => ({
                                  id: child.entityId,
                                  name: child.name,
                                }))
                              : [
                                  {
                                    id: session.allClassifications[0].entityId,
                                    name: session.allClassifications[0].name,
                                  },
                                ]
                          }
                          onSelectChange={(selected) => {
                            setRequest({
                              ...request,
                              entityId: selected,
                            });
                          }}
                          defaultLabel="选择学生"
                          className="w-full"
                        />
                      </div>
                    )}
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
                      request.schoolTestId === undefined ||
                      !request.reportsToProcess ||
                      messages.filter((message) => message.severity === "error").length > 0 ||
                      submitting
                    }
                    className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (
                        !request.schoolTestId ||
                        !request.reportsToProcess ||
                        submitting ||
                        messages.filter((message) => message.severity === "error").length > 0
                      ) {
                        return;
                      }
                      try {
                        setSubmitting(true);
                        setSubmitError(undefined);
                        const response =
                          await fileRouterClient.api.files.schoolTestReports.download.$post({
                            json: {
                              reportsToProcess: request.reportsToProcess,
                              year: request.year ?? undefined,
                              class: request.class ?? undefined,
                              entityId: request.entityId ?? undefined,
                              schoolTestId: request.schoolTestId,
                              includeIsRedoOrMissingUpload: request.includeIsRedoOrMissingUpload,
                            },
                          });
                        if (!response.ok) {
                          const d = (await response.json()) as any;
                          setSubmitError(d.message ?? "系统错误");
                        } else {
                          const bl = await response.blob();
                          FileSaver.saveAs(
                            bl,
                            `${request.reportsToProcess}-${request.schoolTestId}-${request.includeIsRedoOrMissingUpload}.xlsx`
                          );
                          setRequest({
                            reportsToProcess: null,
                            year: null,
                            class: null,
                            entityId: null,
                            schoolTestId: null,
                            includeIsRedoOrMissingUpload: "全部",
                          });
                          setMessages([]);
                          setSubmitError(undefined);
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
                        <span className="ml-2">导出中...</span>
                      </>
                    ) : (
                      "确定导出"
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
