import type { RecordNature } from "@/db/schema/enum";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { format } from "date-fns";
import FileSaver from "file-saver";
import { useState } from "react";
import SingleSelect from "~/components/SingleSelect";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useQueryableSchoolData } from "~/states/schoolData";
import { authClient } from "~/utils/betterAuthClient";
import { fileRouterClient } from "~/utils/routerClient";

export default function ExportAllDataDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const queryableYearsAndClasses = useQueryableSchoolData().data?.data ?? {};
  const [request, setRequest] = useState<{
    scope: Record<string, string[]>;
    inSchool: boolean | undefined;
    nature: RecordNature | undefined;
    date:
      | {
          from: Date | undefined;
          to?: Date | undefined;
        }
      | undefined;
    singleEntity: string | undefined;
  }>({
    scope: {},
    inSchool: undefined,
    nature: undefined,
    date: undefined,
    singleEntity: undefined,
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

  const canSelectSingleEntity =
    session &&
    (session.allClassifications[0].entityType === "student" ||
      session.allClassifications[0].entityType === "parent");
  const selectableEntities = session
    ? session.allClassifications[0].entityType === "student"
      ? [
          {
            name: session.allClassifications[0].name,
            entityId: session.allClassifications[0].entityId,
          },
        ]
      : session.allClassifications[0].entityType === "parent"
      ? session.allClassifications[0].children
      : []
    : [];

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
                      校内/校外 <span className="text-red-500">*</span>
                    </label>
                    <SingleSelect
                      options={[
                        {
                          id: 0,
                          name: "校内",
                        },
                        {
                          id: 1,
                          name: "校外",
                        },
                      ]}
                      onSelectChange={(selected) => {
                        setRequest({
                          ...request,
                          inSchool: selected === null ? undefined : selected === 0,
                        });
                      }}
                      defaultLabel="选择"
                      className="w-full"
                      dropDownClassName="max-h-[250px] overflow-y-auto"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="block text-sm font-medium mb-1">
                      选择数据类型 <span className="text-red-500">*</span>
                    </label>
                    <SingleSelect
                      options={[
                        {
                          id: "exercise",
                          name: "体锻",
                        },
                        {
                          id: "test",
                          name: "体测",
                        },
                      ]}
                      onSelectChange={(selected) => {
                        setRequest({
                          ...request,
                          nature: selected || undefined,
                        });
                      }}
                      defaultLabel="选择"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <label className="block text-sm font-medium mb-1">
                    选择日期范围 <span className="text-red-500">*</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "btn px-2.5 min-w-[15.5rem] bg-white border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-left justify-start",
                          !request.date && "text-muted-foreground"
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
                        {request.date?.from ? (
                          request.date.to ? (
                            <>
                              {format(request.date.from, "LLL dd, y")} -{" "}
                              {format(request.date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(request.date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>选择日期</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[999]" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={request.date?.from}
                        selected={request.date}
                        onSelect={(date) => {
                          setRequest({
                            ...request,
                            date: date,
                          });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {canSelectSingleEntity && (
                  <div className="flex items-start gap-4 gap-y-4">
                    <div className="flex flex-col flex-1">
                      <label className="block text-sm font-medium mb-1">
                        选择导出对象 <span className="text-red-500">*</span>
                      </label>
                      <SingleSelect
                        options={selectableEntities.map((entity) => ({
                          id: entity.entityId,
                          name: entity.name,
                        }))}
                        onSelectChange={(selected) => {
                          setRequest({
                            ...request,
                            singleEntity: selected || undefined,
                          });
                        }}
                        defaultLabel="选择导出对象"
                        className="w-full"
                        dropDownClassName="max-h-[250px] overflow-y-auto"
                      />
                    </div>
                  </div>
                )}
                {!canSelectSingleEntity && (
                  <div className="flex items-start gap-4 gap-y-4">
                    <div className="flex flex-col flex-1">
                      <label className="block text-sm font-medium mb-1">
                        选择导出范围 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col gap-4">
                        {Object.keys(queryableYearsAndClasses).map((year) => (
                          <div key={year} className="">
                            <div className="text-sm font-medium mb-1">{year}</div>
                            <div className="flex flex-row flex-wrap gap-3 gap-y-1">
                              {queryableYearsAndClasses[year].map((class_) => (
                                <div className="" key={`${year}-${class_}`}>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox"
                                      checked={request.scope[year]?.includes(class_) || false}
                                      onChange={(e) => {
                                        console.log({
                                          ...request,
                                          scope: {
                                            ...request.scope,
                                            [year]: request.scope[year]?.includes(class_)
                                              ? request.scope[year]?.filter(
                                                  (class2) => class2 !== class_
                                                )
                                              : [...(request.scope[year] || []), class_],
                                          },
                                        });
                                        setRequest({
                                          ...request,
                                          scope: {
                                            ...request.scope,
                                            [year]: request.scope[year]?.includes(class_)
                                              ? request.scope[year]?.filter(
                                                  (class2) => class2 !== class_
                                                )
                                              : [...(request.scope[year] || []), class_],
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
                      (canSelectSingleEntity && request.singleEntity === undefined) ||
                      (!canSelectSingleEntity && Object.keys(request.scope).length === 0) ||
                      request.inSchool === undefined ||
                      request.nature === undefined ||
                      request.date === undefined ||
                      request.date.from === undefined ||
                      submitting
                    }
                    className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (
                        (canSelectSingleEntity && request.singleEntity === undefined) ||
                        (!canSelectSingleEntity && Object.keys(request.scope).length === 0) ||
                        request.inSchool === undefined ||
                        request.nature === undefined ||
                        request.date === undefined ||
                        request.date.from === undefined ||
                        submitting
                      ) {
                        return;
                      }
                      try {
                        setSubmitting(true);
                        setSubmitError(undefined);
                        const response = await fileRouterClient.api.files.rawData.download.$post({
                          json: {
                            scopeToProcess: request.scope,
                            inSchool: request.inSchool,
                            nature: request.nature,
                            from: request.date.from,
                            to: request.date.to ?? request.date.from,
                            singleEntity: request.singleEntity,
                          },
                        });
                        if (!response.ok) {
                          const d = (await response.json()) as any;
                          setSubmitError(d.message ?? "系统错误");
                        } else {
                          const bl = await response.blob();
                          FileSaver.saveAs(
                            bl,
                            `数据导出-${request.inSchool ? "校内" : "校外"}${
                              request.nature === "exercise" ? "体锻" : "体测"
                            }-${format(request.date.from, "yyyy-MM-dd")}至${format(
                              request.date.to ?? request.date.from,
                              "yyyy-MM-dd"
                            ).toString()}.xlsx`
                          );
                          setRequest({
                            scope: {},
                            inSchool: undefined,
                            nature: undefined,
                            date: undefined,
                            singleEntity: undefined,
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
