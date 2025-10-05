import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fileProcess,
  fileProcessMessage,
  fileStorage,
  permission,
} from "@/db/schema";
import { FileProcessMessageSeverity, FileProcessStatus } from "@/db/schema/enum";
import {
  DEFAULT_OUTDATED_DAY,
  DEFAULT_OUTDATED_MONTH,
  EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT,
} from "@/lib/const";
import { readSchoolTestExcel } from "@/lib/excelOperations";
import { uploadStudentInfoValidator } from "@/lib/validators";
import { and, eq } from "drizzle-orm";
import z from "zod";

import { auth } from "@/lib/auth";
import { Session } from "@/lib/types";
import { mapYearToChinese } from "@/lib/util";

interface SchoolStudentExcelValidatorResult {
  fileProcessId?: string;
  status: FileProcessStatus;
  // TODO: unify messages reutrn like this cross app
  messages: { message: string; severity: FileProcessMessageSeverity }[];
}

// FLOW:
// give immediately response and create record in db (if failed basic check, create error record)
// then process in background & update db after/during process
// frontend will keep polling endpoint for process updates
export const schoolStudentsUpload = async (
  config: z.infer<typeof uploadStudentInfoValidator>,
  file: File,
  copyFilePath: string,
  session: Session
): Promise<SchoolStudentExcelValidatorResult> => {
  const { schoolId, entityId } = session.activeClassifications[0];
  console.log("Received file request for student info upload: ", Object.entries(config));

  let data: string[][] = [];
  try {
    data = (await readSchoolTestExcel(file)) as string[][];
  } catch (error) {
    db.transaction(async (tx) => {
      const [fileStorage_] = await tx
        .insert(fileStorage)
        .values({
          filePath: copyFilePath,
        })
        .returning();
      const [fileProcess_] = await tx
        .insert(fileProcess)
        .values({
          fileRequestNature: "studentInfo",
          isUploadRequested: true,
          status: "failed",
          fileId: fileStorage_.id,
          requestedByEntityId: entityId,
          originalFileName: file.name,
        })
        .returning();
      await tx.insert(fileProcessMessage).values({
        fileProcessId: fileProcess_.id,
        message: error instanceof Error ? error.message : (error as any).toString(),
        severity: "error",
      });
    });
    // TODO LOG ERROR
    console.error("Error reading file: ", error);
    return {
      status: "failed",
      messages: [{ message: "无法读取错误内容，请检查档案", severity: "error" }],
    };
  }

  const headers = data[0];
  const headersToProcess = EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT; // should not fail because of validator
  if (
    headers.length !== EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT.length ||
    !headers.every((header) => EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT.includes(header))
  ) {
    // create error record
    const error = "无法读取错误内容，请检查档案";
    db.transaction(async (tx) => {
      const [fileStorage_] = await tx
        .insert(fileStorage)
        .values({
          filePath: copyFilePath,
        })
        .returning();
      const [fileProcess_] = await tx
        .insert(fileProcess)
        .values({
          fileRequestNature: "studentInfo",
          isUploadRequested: true,
          status: "failed",
          fileId: fileStorage_.id,
          requestedByEntityId: entityId,
          originalFileName: file.name,
        })
        .returning();
      await tx.insert(fileProcessMessage).values({
        fileProcessId: fileProcess_.id,
        message: error,
        severity: "error",
      });
    });

    // TODO LOG ERROR
    console.error(error, ", Headers: ", headers, ", Headers to process: ", headersToProcess);
    return {
      status: "failed",
      messages: [{ message: error, severity: "error" }],
    };
  }

  // passes validation
  const fileProcess_ = await db.transaction(async (tx) => {
    const [fileStorage_] = await tx
      .insert(fileStorage)
      .values({
        filePath: copyFilePath,
      })
      .returning();
    const [fileProcess_] = await tx
      .insert(fileProcess)
      .values({
        fileRequestNature: "studentInfo",
        isUploadRequested: true,
        status: "pending",
        processStartDate: new Date(),
        fileId: fileStorage_.id,
        requestedByEntityId: entityId,
        originalFileName: file.name,
      })
      .returning();
    return fileProcess_;
  });

  // TODO: implement proper queues
  setTimeout(async () => {
    const tStart = performance.now();
    console.log("Processing file request for student info upload: ", fileProcess_.id);

    // process each record
    // row 0-5: year, class, name, gender, internal id, id number
    try {
      const failedRecordsIndices: number[] = [];
      // not retrying if failed for second time, directly push error message to db, hence we just store students name & class
      const failedRecordsIndicesSecondTime: string[] = [];

      let insetDateFrom = new Date(
        parseInt(config.from),
        DEFAULT_OUTDATED_MONTH,
        DEFAULT_OUTDATED_DAY
      );
      insetDateFrom.setDate(insetDateFrom.getDate() + 1);
      let insetDateTo = new Date(parseInt(config.to), DEFAULT_OUTDATED_MONTH, DEFAULT_OUTDATED_DAY);
      insetDateTo.setDate(insetDateTo.getDate() - 1);

      const f = async (recordsToProcess: "all" | number[]) => {
        const dataToProcess =
          recordsToProcess === "all"
            ? data
            : data.filter((_, index) => recordsToProcess.includes(index));

        if (recordsToProcess !== "all") {
          console.log("Re-Processing records: ", dataToProcess);
        }

        for (let i = 1; i < dataToProcess.length; i++) {
          const year = dataToProcess[i][0];
          const class_ = dataToProcess[i][1];
          const name = dataToProcess[i][2];
          const gender = dataToProcess[i][3];
          const internalId = dataToProcess[i][4].toString();
          const idNumber = dataToProcess[i][5]; // not used

          await db.transaction(async (tx) => {
            try {
              const existingEntity = await tx
                .select()
                .from(entity)
                .where(
                  and(eq(entity.internalId, internalId), eq(classification.schoolId, schoolId))
                )
                .innerJoin(classification, eq(entity.id, classification.entityId))
                .limit(1);
              let entityId = existingEntity.length > 0 ? existingEntity[0].entity.id : null;
              console.log("Existing entity: ", existingEntity);
              if (existingEntity.length == 0) {
                // create
                console.log(
                  "Creating entity: ",
                  year,
                  class_,
                  name,
                  internalId,
                  schoolId,
                  internalId.toLowerCase()
                );
                const response = await auth.api.signUpEmail({
                  body: {
                    email: `${internalId}_${schoolId}@school.com`, // dummy email, not used
                    name: name,
                    password: internalId,
                    username: internalId,
                    displayUsername: name,
                    gender,
                    internalId,
                    entityType: "student",
                    phoneNumber: null,
                  },
                });
                console.log("response: ", response);
                entityId = response.user.id;
                await tx.insert(permission).values({
                  entityId: response.user.id,
                  canAccessSameEntityInternalIdInClassification: true,
                });
              }

              if (!entityId) {
                throw new Error("Unable to create entity, missing entity id");
              }

              const validClassification_ =
                existingEntity.length > 0
                  ? (
                      await tx
                        .select()
                        .from(classification)
                        .where(eq(classification.entityId, entityId))
                    ).filter(
                      (classification) =>
                        !classification.validTo ||
                        classification.validTo >
                          new Date(
                            parseInt(config.from),
                            DEFAULT_OUTDATED_MONTH,
                            DEFAULT_OUTDATED_DAY
                          )
                    )
                  : [];

              if (
                validClassification_.length > 0 &&
                validClassification_.some(
                  (classification) =>
                    classification.validFrom.getFullYear() <= parseInt(config.from) &&
                    (!classification.validTo ||
                      classification.validTo.getFullYear() >= parseInt(config.to))
                )
              ) {
                // skip making new classification
                db.insert(fileProcessMessage)
                  .values({
                    fileProcessId: fileProcess_.id,
                    message: `跳过记录: ${dataToProcess[i].join(", ")}，已存在有效学生记录 (${
                      config.from
                    }年-${config.to}年)`,
                    severity: "warning",
                  })
                  .then();
                // TODO LOG WARNING
                console.warn(
                  `跳过记录: ${dataToProcess[i].join(", ")}，已存在有效学生记录 (${config.from}年-${
                    config.to
                  }年)`
                );
                return;
              }

              const [classification_] = await tx
                .insert(classification)
                .values({
                  entityId: entityId,
                  schoolId: schoolId,
                  validFrom: insetDateFrom,
                  validTo: insetDateTo,
                })
                .returning();
              await tx.insert(classificationMap).values({
                classificationId: classification_.id,
                year: mapYearToChinese(year),
                class: class_,
              });
            } catch (error) {
              if (recordsToProcess === "all") failedRecordsIndices.push(i);
              else
                failedRecordsIndicesSecondTime.push(
                  `${dataToProcess[i][2]} - ${dataToProcess[i][5]}`
                );
              console.error("Error processing record: ", i, error);
            }

            console.log(
              "Finished Processing record: ",
              i,
              " of ",
              dataToProcess.length,
              ", isRetry: ",
              recordsToProcess !== "all"
            );
          });
        }
      };

      await f("all");
      if (failedRecordsIndices.length > 0) {
        console.warn(
          "Failed records indices: ",
          failedRecordsIndices,
          ", retrying in 5 seconds..."
        );
        await new Promise((res, rej) =>
          setTimeout(async () => {
            await f(failedRecordsIndices);
            res(true);
          }, 5000)
        );

        if (failedRecordsIndicesSecondTime.length > 0) {
          console.warn(
            "Failed records indices second time: ",
            failedRecordsIndicesSecondTime,
            ", not retrying..."
          );
          for (const record of failedRecordsIndicesSecondTime) {
            db.insert(fileProcessMessage)
              .values({
                fileProcessId: fileProcess_.id,
                message: `系统错误: 无法处理 ${record} 的记录`,
                severity: "warning",
              })
              .then();
          }
          // count as failed if exceed threshold
          if (failedRecordsIndicesSecondTime.length > data.length * 0.05) {
            await db
              .update(fileProcess)
              .set({
                status: "failed",
              })
              .where(eq(fileProcess.id, fileProcess_.id));
          }
          return;
        }
      }

      const tEnd = performance.now();
      await db.insert(fileProcessMessage).values({
        fileProcessId: fileProcess_.id,
        message: `文件处理完成：学生信息（${config.from}年-${config.to}年）\n新增记录: ${
          data.length - failedRecordsIndicesSecondTime.length
        }，  失败记录: ${failedRecordsIndicesSecondTime.length}\n用时: ${(tEnd - tStart) / 1000}s`,
        severity: "info",
      });
      await db
        .update(fileProcess)
        .set({
          status: "completed",
          processEndDate: new Date(Date.now()),
        })
        .where(eq(fileProcess.id, fileProcess_.id));
      console.log("file processing completed");
    } catch (error) {
      console.error("Error processing file: ", error);
      db.update(fileProcess)
        .set({
          status: "failed",
          processEndDate: new Date(Date.now()),
        })
        .where(eq(fileProcess.id, fileProcess_.id))
        .then();
      db.insert(fileProcessMessage)
        .values({
          fileProcessId: fileProcess_.id,
          message: `系统错误: 无法处理文件`,
          severity: "error",
        })
        .then();
      // TODO LOG ERROR
      console.error(error);
    }
  }, 0);

  return {
    status: "pending",
    fileProcessId: fileProcess_.id,
    messages: [],
  };
};
