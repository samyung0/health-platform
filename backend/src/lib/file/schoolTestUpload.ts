import { db } from "@/db";
import {
  classification,
  entity,
  fileProcess,
  fileProcessMessage,
  fileStorage,
  fitnessTest,
  record,
} from "@/db/schema";
import { FileProcessMessageSeverity, FileProcessStatus } from "@/db/schema/enum";
import { EXPECTED_HEADERS_FROM_DAWEI_EXPORT } from "@/lib/const";
import { readSchoolTestExcel } from "@/lib/excelReader";
import { uploadSchoolTestValidator } from "@/lib/validators";
import { and, eq, gt, InferInsertModel } from "drizzle-orm";
import z from "zod";

import measureType_ from "@/data/persistent/measure_type.json";
import { Session } from "@/lib/types";
import { findGrade, findTestBMIScoreAndGrade, findTestScores, parseBaseScore } from "@/lib/util";

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

interface SchoolTestExcelValidatorResult {
  fileProcessId?: string;
  status: FileProcessStatus;
  // TODO: unify messages reutrn like this cross app
  messages: { message: string; severity: FileProcessMessageSeverity }[];
}

// FLOW:
// give immediately response and create record in db (if failed basic check, create error record)
// then process in background & update db after/during process
// frontend will keep polling endpoint for process updates
export const schoolTestUpload = async (
  config: z.infer<typeof uploadSchoolTestValidator>,
  file: File,
  copyFilePath: string,
  session: Session
): Promise<SchoolTestExcelValidatorResult> => {
  const { schoolId, classificationId, schoolType } = session.activeClassifications[0];
  console.log("Received file request for test upload: ", Object.entries(config));

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
          fileRequestNature: "schoolTest",
          isUploadRequested: true,
          status: "failed",
          fileId: fileStorage_.id,
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
  const headersToProcess = JSON.parse(config.recordTypes) as string[]; // should not fail because of validator
  if (
    headers.length !== EXPECTED_HEADERS_FROM_DAWEI_EXPORT.length ||
    !headers.every((header) => EXPECTED_HEADERS_FROM_DAWEI_EXPORT.includes(header)) ||
    headersToProcess.some((header) => !EXPECTED_HEADERS_FROM_DAWEI_EXPORT.includes(header))
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
          fileRequestNature: "schoolTest",
          isUploadRequested: true,
          status: "failed",
          fileId: fileStorage_.id,
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
        fileRequestNature: "schoolTest",
        isUploadRequested: true,
        status: "pending",
        processStartDate: new Date(),
        fileId: fileStorage_.id,
      })
      .returning();
    return fileProcess_;
  });

  // TODO: implement proper queues
  setTimeout(async () => {
    console.log("Processing file request for test upload: ", fileProcess_.id);

    // process each record
    // column 0,1 are dawei internal id, skip
    // column 3,4,7,8 are empty, skip

    try {
      const failedRecordsIndices: number[] = [];
      // not retrying if failed for second time, directly push error message to db, hence we just store students name & class
      const failedRecordsIndicesSecondTime: string[] = [];
      const headersToProcessSliced = headersToProcess.map((header) => header.split("(")[0].trim());
      const slicedHeaders = headers.slice(9).map((header) => header.split("(")[0].trim());
      const mappedHeaders = slicedHeaders.map((header) => {
        const measureType_ = measureType.find((measureType) => measureType.testName === header);
        if (!measureType_) {
          throw new Error(`INTERNAL SERVER ERROR: MEASURE TYPE NOT FOUND: ${header}`);
        }
        return measureType_;
      });
      const configYears = JSON.parse(config.years) as string[];

      let fitnessTestId: string | null = null;

      if (config.isCreateNewTest) {
        const [fitnessTest_] = await db
          .insert(fitnessTest)
          .values({
            schoolId: schoolId,
            name: config.testName!,
            fitnessTestDate: config.testDate,
          })
          .returning();
        fitnessTestId = fitnessTest_.id;
      } else {
        const [fitnessTest_] = await db
          .select()
          .from(fitnessTest)
          .where(and(eq(fitnessTest.schoolId, schoolId), eq(fitnessTest.name, config.testName!)))
          .limit(1);
        if (!fitnessTest_) {
          db.update(fileProcess)
            .set({
              status: "failed",
            })
            .where(eq(fileProcess.id, fileProcess_.id));
          db.insert(fileProcessMessage).values({
            fileProcessId: fileProcess_.id,
            message: `INTERNAL SERVER ERROR: FITNESS TEST NOT FOUND: ${config.testName!}`,
            severity: "error",
          });
          // TODO LOG ERROR
          console.error(`INTERNAL SERVER ERROR: FITNESS TEST NOT FOUND: ${config.testName!}`);
          return;
        }
        fitnessTestId = fitnessTest_.id;
      }

      const recordsToPush: InferInsertModel<typeof record>[] = [];
      let skipped = 0;

      const f = async (recordsToProcess: "all" | number[]) => {
        const dataToProcess =
          recordsToProcess === "all"
            ? data
            : data.filter((_, index) => recordsToProcess.includes(index));

        for (let i = 1; i < dataToProcess.length; i++) {
          const name = dataToProcess[i][5];
          const gender = dataToProcess[i][6];
          const year = dataToProcess[i][2].slice(0, dataToProcess[i][2].indexOf("年级") + 2);
          const class_ = dataToProcess[i][2].slice(dataToProcess[i][2].indexOf("年级") + 2);

          if (!configYears.includes(year)) {
            // console.info(
            //   `跳过记录: ${dataToProcess[i].join(", ")}，不在有效年级内 (${configYears.join(", ")})`
            // );
            skipped++;
            continue;
          }

          const [validClassification_] = await db
            .select({
              id: classification.id,
            })
            .from(classification)
            .where(
              and(
                eq(entity.name, name),
                eq(entity.gender, gender),
                eq(classification.schoolId, schoolId),
                gt(classification.validTo, new Date(Date.now()))
              )
            )
            .innerJoin(entity, eq(classification.entityId, entity.id))
            .limit(1);
          if (!validClassification_) {
            db.insert(fileProcessMessage).values({
              fileProcessId: fileProcess_.id,
              message: `跳过记录: ${dataToProcess[i].join(", ")}，无法识别学生`,
              severity: "warning",
            });
            // TODO LOG WARNING
            console.warn(`跳过记录: ${dataToProcess[i].join(", ")}，无法识别学生`);
            skipped++;
            continue;
          }

          try {
            for (let j = 0; j < slicedHeaders.length; j++) {
              const isApplicableToGender =
                mappedHeaders[j].applicableToGender === "全部" ||
                mappedHeaders[j].applicableToGender === gender;
              const isApplicableToSchoolTypeAndYear =
                Object.keys(mappedHeaders[j].applicableTo).length === 0 ||
                (mappedHeaders[j].applicableTo.hasOwnProperty(schoolType) &&
                  (mappedHeaders[j].applicableTo[schoolType].length === 0 ||
                    mappedHeaders[j].applicableTo[schoolType].includes(year)));
              if (!isApplicableToGender || !isApplicableToSchoolTypeAndYear) continue;
              if (!headersToProcessSliced.includes(slicedHeaders[j])) continue;
              const row: InferInsertModel<typeof record> = {
                recordType: slicedHeaders[j],
                inSchool: true,
                nature: "test",
                fitnessTestId: fitnessTestId,
                score: parseBaseScore(dataToProcess[i][j + 9]),
                isRedoOrMissingUpload: config.isRedoOrMissingUpload,
                isRedoOrMissingUploadTargetFitnesstTestId: config.isRedoOrMissingUpload
                  ? fitnessTestId
                  : null,
                toEntityClassification: validClassification_.id,
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

              // console.log(
              //   "normalizedScore: ",
              //   normalizedScore,
              //   "additionalScore: ",
              //   additionalScore
              // );

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
                nature: "test",
                fitnessTestId: fitnessTestId,
                score: bmi,
                isRedoOrMissingUpload: config.isRedoOrMissingUpload,
                isRedoOrMissingUploadTargetFitnesstTestId: config.isRedoOrMissingUpload
                  ? fitnessTestId
                  : null,
                toEntityClassification: validClassification_.id,
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

          console.log(
            "Finished reading record: ",
            i,
            " of ",
            dataToProcess.length,
            ", isRetry: ",
            recordsToProcess !== "all"
          );
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
            db.insert(fileProcessMessage).values({
              fileProcessId: fileProcess_.id,
              message: `系统错误: 无法处理 ${record} 的记录`,
              severity: "warning",
            });
          }
          // count as failed if exceed threshold
          // NOT PUSHING TO DB RECORDS
          if (failedRecordsIndicesSecondTime.length > data.length * 0.05) {
            db.update(fileProcess)
              .set({
                status: "failed",
              })
              .where(eq(fileProcess.id, fileProcess_.id));
            db.insert(fileProcessMessage).values({
              fileProcessId: fileProcess_.id,
              message: `系统错误: 无法处理文件, 失败记录超过 5%`,
              severity: "error",
            });
            return;
          }
        }
      }

      // SINGLE INSERT
      if (recordsToPush.length > 0) {
        await db.insert(record).values(recordsToPush);
      } else {
        db.insert(fileProcessMessage).values({
          fileProcessId: fileProcess_.id,
          message: `系统警告: 没有记录`,
          severity: "warning",
        });
      }

      // if 补测, need to generate new excel file that includes all records in another folder
      if (config.isRedoOrMissingUpload) {
        // read old excel file
      }

      db.update(fileProcess)
        .set({
          status: "completed",
          processEndDate: new Date(Date.now()),
        })
        .where(eq(fileProcess.id, fileProcess_.id));
      console.log(
        "file processing completed, records skipped: ",
        skipped,
        ", records pushed: ",
        recordsToPush.length
      );
    } catch (error) {
      console.error("Error processing file: ", error);
      db.update(fileProcess)
        .set({
          status: "failed",
          processEndDate: new Date(Date.now()),
        })
        .where(eq(fileProcess.id, fileProcess_.id));
      db.insert(fileProcessMessage).values({
        fileProcessId: fileProcess_.id,
        message: `系统错误: 无法处理文件`,
        severity: "error",
      });
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
