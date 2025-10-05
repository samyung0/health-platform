import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fileProcess,
  fileProcessMessage,
  fileStorage,
  record,
} from "@/db/schema";
import { FileProcessMessageSeverity, FileProcessStatus } from "@/db/schema/enum";
import { EXPECTED_HEADERS_FROM_DAWEI_EXPORT } from "@/lib/const";
import { readSchoolTestExcel } from "@/lib/excelOperations";
import { uploadSchoolExerciseValidator } from "@/lib/validators";
import { and, eq, gt, InferInsertModel } from "drizzle-orm";
import z from "zod";

import measureType_ from "@/data/persistent/measure_type.json";
import { Session } from "@/lib/types";
import {
  chunk,
  findGrade,
  findTestBMIScoreAndGrade,
  findTestScores,
  mapYearToChinese,
  parseBaseScore,
} from "@/lib/util";

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

interface SchoolExerciseExcelValidatorResult {
  fileProcessId?: string;
  status: FileProcessStatus;
  // TODO: unify messages reutrn like this cross app
  messages: { message: string; severity: FileProcessMessageSeverity }[];
}

// FLOW:
// give immediately response and create record in db (if failed basic check, create error record)
// then process in background & update db after/during process
// frontend will keep polling endpoint for process updates
export const schoolExerciseUpload = async (
  config: z.infer<typeof uploadSchoolExerciseValidator>,
  file: File,
  copyFilePath: string,
  session: Session
): Promise<SchoolExerciseExcelValidatorResult> => {
  const { schoolId, entityId, schoolType, classificationId } = session.activeClassifications[0];
  console.log("Received file request for exercise upload: ", Object.entries(config));

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
          fileRequestNature: "schoolExercise",
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
      messages: [{ message: "无法读取错误内容，请重新在大沩平台导出并上传", severity: "error" }],
    };
  }

  // check if dawei format
  const headers = data[0];
  if (
    headers.length !== EXPECTED_HEADERS_FROM_DAWEI_EXPORT.length ||
    !headers.every((header) => EXPECTED_HEADERS_FROM_DAWEI_EXPORT.includes(header))
  ) {
    // create error record
    const error = "无法读取错误内容，请重新在大沩平台导出并上传";
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
          fileRequestNature: "schoolExercise",
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
    console.error(error, ", Headers: ", headers);
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
        fileRequestNature: "schoolExercise",
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
    console.log("Processing file request for exercise upload: ", fileProcess_.id);
    const tStart = performance.now();

    // process each record
    // column 0,1 are dawei internal id, skip
    // column 3,4,7,8 are empty, skip

    try {
      const failedRecordsIndices: number[] = [];
      // not retrying if failed for second time, directly push error message to db, hence we just store students name & class
      const failedRecordsIndicesSecondTime: string[] = [];
      const slicedHeaders = headers.slice(9).map((header) => header.split("(")[0].trim());
      const mappedHeaders = slicedHeaders.map((header) => {
        const measureType_ = measureType.find((measureType) => measureType.testName === header);
        if (!measureType_) {
          throw new Error(`INTERNAL SERVER ERROR: MEASURE TYPE NOT FOUND: ${header}`);
        }
        return measureType_;
      });

      const recordsToPush: InferInsertModel<typeof record>[] = [];
      const validStudentRecords: string[][] = [];
      let skippedDueToInvalidOrMismatchClassification = 0;

      const f = async (recordsToProcess: "all" | number[]) => {
        const dataToProcess =
          recordsToProcess === "all"
            ? data
            : data.filter((_, index) => recordsToProcess.includes(index));

        for (let i = 1; i < dataToProcess.length; i++) {
          if (data[i].every((cell) => cell === null || cell === "")) continue;

          const name = dataToProcess[i][5];
          const gender = dataToProcess[i][6];
          const year_ = dataToProcess[i][2].slice(0, dataToProcess[i][2].indexOf("年级") + 2);
          const year = mapYearToChinese(year_);
          const class_ = dataToProcess[i][2].slice(dataToProcess[i][2].indexOf("年级") + 2);

          if (!name || !gender || !year || !class_) {
            db.insert(fileProcessMessage)
              .values({
                fileProcessId: fileProcess_.id,
                message: `跳过记录: ${dataToProcess[i].join(", ")}，无法识别学生`,
                severity: "warning",
              })
              .then();
            // TODO LOG WARNING
            console.warn(`跳过记录: ${dataToProcess[i].join(", ")}，无法识别学生`);
            skippedDueToInvalidOrMismatchClassification++;
            continue;
          }

          const validClassification_ = await db
            .select({
              id: classification.id,
              internalId: entity.internalId,
            })
            .from(classification)
            .where(
              and(
                eq(entity.name, name),
                eq(entity.gender, gender),
                eq(classification.schoolId, schoolId),
                eq(classificationMap.year, year),
                eq(classificationMap.class, class_),
                gt(classification.validTo, new Date(Date.now()))
              )
            )
            .innerJoin(entity, eq(classification.entityId, entity.id))
            .innerJoin(
              classificationMap,
              eq(classification.id, classificationMap.classificationId)
            );
          if (validClassification_.length === 0) {
            db.insert(fileProcessMessage)
              .values({
                fileProcessId: fileProcess_.id,
                message: `跳过记录: ${dataToProcess[i].join(", ")}，无法识别学生`,
                severity: "warning",
              })
              .then();
            // TODO LOG WARNING
            console.warn(`跳过记录: ${dataToProcess[i].join(", ")}，无法识别学生`);
            skippedDueToInvalidOrMismatchClassification++;
            continue;
          }

          if (
            validClassification_.length > 1 &&
            validClassification_.some(
              (classification) => classification.internalId !== validClassification_[0].internalId
            )
          ) {
            db.insert(fileProcessMessage)
              .values({
                fileProcessId: fileProcess_.id,
                message: `无法处理记录: ${dataToProcess[i].join(", ")}，存在多个匹配学生`,
                severity: "warning",
              })
              .then();
            // TODO LOG WARNING
            console.warn(`无法处理记录: ${dataToProcess[i].join(", ")}，存在多个匹配学生`);
            skippedDueToInvalidOrMismatchClassification++;
            continue;
          }

          if (recordsToProcess === "all") validStudentRecords.push(dataToProcess[i]);

          try {
            for (let j = 0; j < slicedHeaders.length; j++) {
              const score = dataToProcess[i][j + 9];
              if (!score) continue;
              const isApplicableToGender =
                mappedHeaders[j].applicableToGender === "全部" ||
                mappedHeaders[j].applicableToGender === gender;
              const isApplicableToSchoolTypeAndYear =
                Object.keys(mappedHeaders[j].applicableTo).length === 0 ||
                (mappedHeaders[j].applicableTo.hasOwnProperty(schoolType) &&
                  (mappedHeaders[j].applicableTo[schoolType].length === 0 ||
                    mappedHeaders[j].applicableTo[schoolType].includes(year)));
              if (!isApplicableToGender || !isApplicableToSchoolTypeAndYear) continue;
              const row: InferInsertModel<typeof record> = {
                recordType: slicedHeaders[j],
                inSchool: true,
                nature: "exercise",
                score: parseBaseScore(dataToProcess[i][j + 9]),
                exerciseDate: config.exerciseDate,
                toEntityClassification: validClassification_[0].id,
                fromEntityClassification: classificationId,
              };

              // do not calculate for 身高，体重, empty record
              if (!mappedHeaders[j]!.isCalculatedAndReported || !row.score) {
                recordsToPush.push(row);
                continue;
              }

              const { normalizedScore, additionalScore } = findTestScores(
                row.score,
                slicedHeaders[j],
                gender,
                schoolType,
                year,
                mappedHeaders[j]!.compareDirection
              );
              recordsToPush.push({
                ...row,
                normalizedScore: normalizedScore,
                additionalScore: additionalScore,
                grade: findGrade(normalizedScore),
              });
            }

            // calculate BMI
            const height = parseBaseScore(data[i][9]);
            const weight = parseBaseScore(data[i][10]);
            if (height && weight) {
              const bmi = Number((weight / (height / 100) / (height / 100)).toFixed(1));
              const { normalizedScore, grade } = findTestBMIScoreAndGrade(
                bmi,
                gender,
                schoolType,
                year
              );
              recordsToPush.push({
                recordType: "体重指数（BMI）",
                inSchool: true,
                nature: "exercise",
                score: bmi,
                exerciseDate: config.exerciseDate,
                toEntityClassification: validClassification_[0].id,
                fromEntityClassification: classificationId,
                normalizedScore: normalizedScore,
                grade: grade,
              });
            }
          } catch (error) {
            // tx.rollback();
            if (recordsToProcess === "all") failedRecordsIndices.push(i);
            else
              failedRecordsIndicesSecondTime.push(
                `${dataToProcess[i][2]} - ${dataToProcess[i][5]}`
              );
            console.error("Error processing record: ", i, error);
          }
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
          // NOT PUSHING TO DB RECORDS
          if (failedRecordsIndicesSecondTime.length > data.length * 0.05) {
            db.update(fileProcess)
              .set({
                status: "failed",
              })
              .where(eq(fileProcess.id, fileProcess_.id))
              .then();
            db.insert(fileProcessMessage)
              .values({
                fileProcessId: fileProcess_.id,
                message: `系统错误: 无法处理文件, 失败记录超过 5%`,
                severity: "error",
              })
              .then();
            console.error("系统错误: 无法处理文件, 失败记录超过 5%");
            return;
          }
        }
      }

      console.log(
        "file reading completed, records processed: ",
        validStudentRecords.length,
        ", records skipped: ",
        skippedDueToInvalidOrMismatchClassification,
        ", records failed: ",
        failedRecordsIndicesSecondTime.length,
        ", rows to be added: ",
        recordsToPush.length
      );

      await db.transaction(async (tx) => {
        try {
          if (recordsToPush.length > 0) {
            // chunk
            // dont rely on default max size, as rach record can have different params
            for (const chunk_ of chunk(recordsToPush, 2000)) {
              await tx.insert(record).values(chunk_);
            }
          } else {
            // not tx
            db.insert(fileProcessMessage)
              .values({
                fileProcessId: fileProcess_.id,
                message: `系统警告: 没有记录`,
                severity: "warning",
              })
              .then();
            console.warn("系统警告: 没有记录");
          }
          console.log("records added");
        } catch (error) {
          tx.rollback();
          throw error;
        }
      });

      const tEnd = performance.now();

      await db.insert(fileProcessMessage).values({
        fileProcessId: fileProcess_.id,
        message: `文件处理完成：体锻上载 - ${config.exerciseDate.toDateString()}\n新增记录: ${
          recordsToPush.length
        }， 跳过记录: ${skippedDueToInvalidOrMismatchClassification}， 失败记录: ${
          failedRecordsIndicesSecondTime.length
        }\n用时: ${(tEnd - tStart) / 1000}s`,
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
    }
  }, 0);

  return {
    status: "pending",
    fileProcessId: fileProcess_.id,
    messages: [],
  };
};
