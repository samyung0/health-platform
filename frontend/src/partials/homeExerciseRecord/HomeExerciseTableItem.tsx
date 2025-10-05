import measureType_ from "@/data/persistent/measure_type.json";
import type { InferResponseType } from "hono/client";
import { recordRouterClient } from "../../utils/routerClient";
import DropdownEditMenu from "~/components/DropdownEditMenu";
import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { cn } from "~/lib/utils";
import { queryClient } from "~/utils/QueryClient";

const measureType = measureType_ as {
  testName: string;
  exerciseName: string | null;
  unit: string;
  canBeExercised: boolean;
  exerciseScoreCalculationMethod: string | null;
  isCalculatedAndReported: boolean;
  applicableToGender: string;
  applicableTo: Record<string, string[]>;
  compareDirection: string;
}[];

function HomeExerciseTableItem(
  props: InferResponseType<typeof recordRouterClient.api.records.homeExercise.$get>["data"][number]
) {
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <tbody className="text-sm">
      {/* Row */}
      <tr>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.recordType}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.recordToEntity.name}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>
            {props.score?.toFixed(1)}（
            {measureType.find((measure) => measure.exerciseName === props.recordType)?.unit}）
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.exerciseDuration}（分钟）</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.grade}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.recordToEntity.year}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.recordToEntity.class}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{props.exerciseDate && new Date(props.exerciseDate).toLocaleDateString()}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <DropdownEditMenu align="right" className="relative inline-flex">
            <li>
              <button
                className="font-medium text-sm text-red-500 hover:text-red-600 flex py-1 px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setDangerModalOpen(true);
                }}
              >
                删除记录
              </button>
            </li>
          </DropdownEditMenu>

          <Dialog open={dangerModalOpen} onClose={setDangerModalOpen} className="relative z-[9999]">
            <DialogBackdrop
              transition
              className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
                <DialogPanel
                  transition
                  className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-5 py-3 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] overflow-y-auto "
                >
                  <div className="flex space-x-4 w-full min-w-[300px]">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-700">
                      <svg
                        className="shrink-0 fill-current text-red-500"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                      </svg>
                    </div>
                    {/* Content */}
                    <div className="pl-4 flex-1">
                      {/* Modal header */}
                      <div className="mb-4 p-2">
                        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          删除该记录？
                        </div>
                      </div>
                      {/* Modal content */}
                      {/* <div className="text-sm mb-10">
                      <div className="space-y-2">
                        <p>
                          Semper eget duis at tellus at urna condimentum mattis pellentesque lacus
                          suspendisse faucibus interdum.
                        </p>
                      </div>
                    </div> */}
                      {/* Modal footer */}
                      <div className="flex flex-wrap justify-end space-x-2">
                        <button
                          className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDangerModalOpen(false);
                          }}
                        >
                          取消
                        </button>
                        <button
                          className="btn-sm bg-red-500 hover:bg-red-600 text-white"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (deleting) return;
                            setDeleting(true);
                            try {
                              await recordRouterClient.api.records.homeExercise[":id"].$delete({
                                param: {
                                  id: props.recordId,
                                },
                              });
                              queryClient.invalidateQueries({ queryKey: ["homeExerciseRecords"] });
                            } catch (error) {
                              console.error(error);
                            } finally {
                              setDeleting(false);
                              setDangerModalOpen(false);
                            }
                          }}
                        >
                          {deleting ? (
                            <>
                              <svg
                                className="animate-spin fill-current shrink-0"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                              >
                                <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                              </svg>
                              <span className="ml-2">删除中</span>
                            </>
                          ) : (
                            "确认删除"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </Dialog>
        </td>
      </tr>
    </tbody>
  );
}

export default HomeExerciseTableItem;
