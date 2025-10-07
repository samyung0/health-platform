// import measureType_ from "@/data/persistent/measure_type.json";
// import type { TestName } from "@/db/schema";
// import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
// import { format } from "date-fns";
// import { useState } from "react";
// import SingleSelect from "~/components/SingleSelect";
// import { Calendar } from "~/components/ui/calendar";
// import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
// import { cn } from "~/lib/utils";
// import { authClient } from "~/utils/betterAuthClient";
// import { queryClient } from "~/utils/QueryClient";
// import { recordRouterClient } from "~/utils/routerClient";

// const measureType = measureType_ as {
//   testName: string;
//   testName: string | null;
//   unit: string;
//   canBeExercised: boolean;
//   exerciseScoreCalculationMethod: string | null;
//   isCalculatedAndReported: boolean;
//   applicableToGender: string;
//   applicableTo: Record<string, string[]>;
//   compareDirection: string;
// }[];

// export default function SchoolTestRecordsDialog({
//   open,
//   setOpen,
// }: {
//   open: boolean;
//   setOpen: (open: boolean) => void;
// }) {
//   const { data: session } = authClient.useSession();
//   const [request, setRequest] = useState<{
//     recordType: TestName | undefined;
//     exerciseDate: Date | undefined;
//     exerciseDuration: number | undefined;
//     score: number | undefined;
//     toEntityId: string | undefined;
//   }>({
//     recordType: undefined,
//     exerciseDate: undefined,
//     exerciseDuration: undefined,
//     score: undefined,
//     toEntityId: undefined,
//   });

//   const [messages, setMessages] = useState<
//     {
//       severity: "error" | "warning";
//       message: string;
//     }[]
//   >([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [submitError, setSubmitError] = useState<string | undefined>(undefined);

//   const uploadTarget = session
//     ? session.allClassifications[0].entityType === "parent"
//       ? session?.allClassifications[0].children
//       : [
//           {
//             entityId: session.allClassifications[0].entityId,
//             name: session.allClassifications[0].name,
//           },
//         ]
//     : [];

//   return (
//     <Dialog open={open} onClose={setOpen} className="relative z-[999]">
//       <DialogBackdrop
//         transition
//         className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
//       />

//       <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
//         <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
//           <DialogPanel
//             transition
//             className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 w-[95vw] lg:w-[85vw] xl:w-[70vw] sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] overflow-y-auto min-h-[400px]"
//           >
//             <div className="flex flex-col col-span-full lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-none rounded-xl">
//               <button
//                 className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 ml-auto mb-2"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setOpen(false);
//                 }}
//               >
//                 <div className="sr-only">Close</div>
//                 <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
//                   <path d="M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z" />
//                 </svg>
//               </button>
//               <div className="space-y-4">
//                 <div className="flex items-start gap-4 gap-y-4">
//                   <div className="flex flex-col flex-1">
//                     <label className="block text-sm font-medium mb-1">
//                       运动项目 <span className="text-red-500">*</span>
//                     </label>
//                     <SingleSelect
//                       options={[
//                         "体重指数（BMI）",
//                         "50米跑",
//                         "坐位体前屈",
//                         "跳绳",
//                         "仰卧起坐",
//                         "50米×8往返跑",
//                       ].map((item) => ({
//                         id: item,
//                         name: item,
//                       }))}
//                       onSelectChange={(selected) => {
//                         setRequest({
//                           ...request,
//                           recordType: selected ? (selected as ExerciseName) : undefined,
//                         });
//                       }}
//                       defaultLabel="选择"
//                       className="w-full"
//                     />
//                   </div>
//                   <div className="flex flex-col flex-1">
//                     <label className="block text-sm font-medium mb-1">
//                       运动日期 <span className="text-red-500">*</span>
//                     </label>
//                     <Popover>
//                       <PopoverTrigger asChild>
//                         <button
//                           className={cn(
//                             "btn px-2.5 min-w-[15.5rem] bg-white border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-left justify-start",
//                             !request.exerciseDate && "text-muted-foreground"
//                           )}
//                         >
//                           {/* <CalendarIcon /> */}
//                           <svg
//                             className="fill-current text-gray-400 dark:text-gray-500 ml-1 mr-2"
//                             width="16"
//                             height="16"
//                             viewBox="0 0 16 16"
//                           >
//                             <path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z"></path>
//                             <path d="M4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4ZM2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z"></path>
//                           </svg>
//                           {request.exerciseDate ? (
//                             format(request.exerciseDate, "LLL dd, y")
//                           ) : (
//                             <span>选择日期</span>
//                           )}
//                         </button>
//                       </PopoverTrigger>
//                       <PopoverContent className="w-auto p-0 z-[999]" align="start">
//                         <Calendar
//                           mode="single"
//                           classNames={{
//                             selected:
//                               "rounded-md bg-violet-500 text-white hover:bg-violet-500 hover:text-white focus:bg-violet-500 focus:text-white",
//                           }}
//                           defaultMonth={request.exerciseDate}
//                           selected={request.exerciseDate}
//                           onSelect={(date: Date | undefined) =>
//                             setRequest({ ...request, exerciseDate: date })
//                           }
//                         />
//                       </PopoverContent>
//                     </Popover>
//                   </div>

//                   <div className="flex flex-col flex-1">
//                     <label className="block text-sm font-medium mb-1">
//                       上传对象 <span className="text-red-500">*</span>
//                     </label>
//                     <SingleSelect
//                       options={uploadTarget.map((item) => ({
//                         id: item.entityId,
//                         name: item.name,
//                       }))}
//                       onSelectChange={(selected) => {
//                         setRequest({
//                           ...request,
//                           toEntityId: selected ? selected : undefined,
//                         });
//                       }}
//                       defaultLabel="选择"
//                       className="w-full"
//                     />
//                   </div>
//                 </div>
//                 {request.recordType && (
//                   <div className="flex items-start gap-4 gap-y-4">
//                     <div className="flex flex-col flex-1">
//                       <label className="block text-sm font-medium mb-1">
//                         分数（
//                         {["50米跑", "50米×8往返跑"].includes(request.recordType)
//                           ? "米"
//                           : measureType.find(
//                               (measure) => measure.testName === request.recordType
//                             )?.unit}
//                         ） <span className="text-red-500">*</span>
//                       </label>
//                       <input
//                         className="form-input flex-1 placeholder:italic"
//                         type="number"
//                         value={request.score}
//                         onChange={(e) => {
//                           setRequest({
//                             ...request,
//                             score: e.target.value ? parseFloat(e.target.value) : undefined,
//                           });
//                         }}
//                       />
//                     </div>

//                     <div className="flex flex-col flex-1">
//                       <label className="block text-sm font-medium mb-1">
//                         运动耗时（分钟） <span className="text-red-500">*</span>
//                       </label>
//                       <input
//                         className="form-input flex-1 placeholder:italic"
//                         type="number"
//                         value={request.exerciseDuration}
//                         onChange={(e) => {
//                           setRequest({
//                             ...request,
//                             exerciseDuration: e.target.value
//                               ? parseFloat(e.target.value)
//                               : undefined,
//                           });
//                         }}
//                       />
//                     </div>
//                   </div>
//                 )}
//                 {messages.map((message, index) => (
//                   <div
//                     className="inline-flex flex-col w-full px-4 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-400"
//                     key={index}
//                   >
//                     <div className="flex w-full justify-between items-start">
//                       <div className="flex">
//                         <svg
//                           className={cn(
//                             "shrink-0 fill-current text-yellow-500 mt-[3px] mr-3",
//                             message.severity === "error" ? "text-red-500" : "text-yellow-500"
//                           )}
//                           width="16"
//                           height="16"
//                           viewBox="0 0 16 16"
//                         >
//                           <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
//                         </svg>
//                         <div>
//                           <div className="font-medium text-gray-800 dark:text-gray-100 mb-1">
//                             {message.severity === "error" ? "错误" : "警告"}
//                           </div>
//                           <div className="whitespace-pre-line">{message.message}</div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               {/* htmlForm footer */}
//               <div className="mt-6">
//                 <div className="mb-4">
//                   <button
//                     disabled={
//                       request.recordType === undefined ||
//                       request.exerciseDate === undefined ||
//                       request.toEntityId === undefined ||
//                       request.score === undefined ||
//                       messages.filter((message) => message.severity === "error").length > 0 ||
//                       submitting
//                     }
//                     className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
//                     onClick={async () => {
//                       if (
//                         request.recordType === undefined ||
//                         request.exerciseDate === undefined ||
//                         request.toEntityId === undefined ||
//                         request.score === undefined ||
//                         messages.filter((message) => message.severity === "error").length > 0 ||
//                         submitting
//                       ) {
//                         return;
//                       }
//                       try {
//                         setSubmitting(true);
//                         setSubmitError(undefined);
//                         const response = await recordRouterClient.api.records.homeExercise.$post({
//                           json: {
//                             recordType: request.recordType,
//                             testDate: request.testDate,
//                             exerciseDuration: request.exerciseDuration,
//                             score: request.score,
//                             toEntityId: request.toEntityId,
//                           },
//                         });
//                         const d = await response.json();
//                         if (!response.ok) {
//                           setSubmitError((d as any).message ?? "系统错误");
//                         } else {
//                           setRequest({
//                             recordType: undefined,
//                             exerciseDate: undefined,
//                             exerciseDuration: undefined,
//                             score: undefined,
//                             toEntityId: undefined,
//                           });
//                           setSubmitError(undefined);
//                           setMessages([]);
//                           setOpen(false);
//                           queryClient.invalidateQueries({ queryKey: ["homeExerciseRecords"] });
//                         }
//                       } catch (error) {
//                         console.error(error);
//                         setSubmitError("系统错误");
//                       } finally {
//                         setSubmitting(false);
//                       }
//                     }}
//                   >
//                     {submitting ? (
//                       <>
//                         <svg
//                           className="animate-spin fill-current shrink-0"
//                           width="16"
//                           height="16"
//                           viewBox="0 0 16 16"
//                         >
//                           <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
//                         </svg>
//                         <span className="ml-2">送出中...</span>
//                       </>
//                     ) : (
//                       "确定送出"
//                     )}
//                   </button>
//                 </div>
//                 <div className="text-xs font-medium -my-1 text-gray-500 text-center">
//                   系统会自动计算部分项目的分数
//                 </div>
//                 {submitError && (
//                   <div className="text-xs font-medium my-2 text-red-500 text-center">
//                     {submitError}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </DialogPanel>
//         </div>
//       </div>
//     </Dialog>
//   );
// }
