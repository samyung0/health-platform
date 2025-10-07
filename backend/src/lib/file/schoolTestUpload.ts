import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fileProcess,
  fileProcessMessage,
  fileStorage,
  fitnessTest,
  record,
} from "@/db/schema";
import { FileProcessMessageSeverity, FileProcessStatus } from "@/db/schema/enum";
import { EXPECTED_HEADERS_FROM_DAWEI_EXPORT } from "@/lib/const";
import { readSchoolTestExcel } from "@/lib/excelOperations";
import { uploadSchoolTestValidator } from "@/lib/validators";
import { and, eq, gt, InferInsertModel } from "drizzle-orm";
import Path from "path";
import z from "zod";

import measureType_ from "@/data/persistent/measure_type.json";
import { mergeSchoolTestFromUpload } from "@/lib/file/mergeSchoolTest";
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
  const { schoolId, entityId, schoolType, classificationId } = session.activeClassifications[0];
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
          fileRequestNature: "schoolTest",
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
        fileRequestNature: "schoolTest",
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
    console.log("Processing file request for test upload: ", fileProcess_.id);
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
      const configYearsAndClasses_ = JSON.parse(config.yearsAndClassesToProcess) as Record<
        string,
        string[]
      >;
      const configYearsAndClasses = Object.fromEntries(
        Object.entries(configYearsAndClasses_).map(([key, value]) => [mapYearToChinese(key), value])
      );

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
            .where(eq(fileProcess.id, fileProcess_.id))
            .then();
          db.insert(fileProcessMessage)
            .values({
              fileProcessId: fileProcess_.id,
              message: `INTERNAL SERVER ERROR: FITNESS TEST NOT FOUND: ${config.testName!}`,
              severity: "error",
            })
            .then();
          // TODO LOG ERROR
          console.error(`INTERNAL SERVER ERROR: FITNESS TEST NOT FOUND: ${config.testName!}`);
          return;
        }
        fitnessTestId = fitnessTest_.id;
      }

      const recordsToPush: InferInsertModel<typeof record>[] = [];
      const validStudentRecords: string[][] = [];
      let skippedDueToInvalidOrMismatchClassification = 0;
      const classScoresGrades: Record<
        string,
        Record<
          string,
          {
            totalAvgNormScore: number;
            totalProcessed: number;
            totalPassing: number;
            normScore: number;
            additionalScore: number;
            totalParticipating: number;
          }
        >
      > = {}; // [avgNormScore, grade]

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

          if (
            !configYearsAndClasses.hasOwnProperty(year) ||
            !configYearsAndClasses[year].includes(class_)
          ) {
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

          if (!classScoresGrades[year]) classScoresGrades[year] = {};
          if (!classScoresGrades[year][class_])
            classScoresGrades[year][class_] = {
              totalAvgNormScore: 0,
              normScore: 0,
              additionalScore: 0,
              totalProcessed: 0,
              totalPassing: 0,
              totalParticipating: 0,
            };

          if (recordsToProcess === "all") validStudentRecords.push(dataToProcess[i]);

          try {
            let weightedSum = 0;
            let additionalScoreSum = 0;
            let hasAnyNonNullScore = false;
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
              const row: InferInsertModel<typeof record> = {
                recordType: slicedHeaders[j],
                inSchool: true,
                nature: "test",
                fitnessTestId: fitnessTestId,
                score: parseBaseScore(dataToProcess[i][j + 9]),
                isRedoOrMissingUpload: config.isRedoOrMissingUpload,
                toEntityClassification: validClassification_[0].id,
                fromEntityClassification: classificationId,
              };

              if (row.score !== null && row.score !== undefined) hasAnyNonNullScore = true;

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
              switch (slicedHeaders[j]) {
                case "体重指数（BMI）":
                  weightedSum += normalizedScore * 0.15;
                  break;
                case "肺活量":
                  weightedSum += normalizedScore * 0.15;
                  break;
                case "50米跑":
                  weightedSum += normalizedScore * 0.2;
                  break;

                case "坐位体前屈":
                  weightedSum +=
                    normalizedScore *
                    (schoolType === "小学" && (year === "一年级" || year === "二年级")
                      ? 0.3
                      : schoolType === "小学" && (year === "三年级" || year === "四年级")
                      ? 0.2
                      : 0.1);
                case "一分钟跳绳":
                  weightedSum +=
                    normalizedScore *
                    (schoolType === "小学" &&
                    (year === "一年级" ||
                      year === "二年级" ||
                      year === "三年级" ||
                      year === "四年级")
                      ? 0.2
                      : 0.1);
                  break;
                case "一分钟仰卧起坐":
                  weightedSum +=
                    normalizedScore *
                    (schoolType === "小学" && (year === "三年级" || year === "四年级")
                      ? 0.1
                      : schoolType === "小学" && (year === "五年级" || year === "六年级")
                      ? 0.2
                      : 0);
                  break;
                case "50米×8往返跑":
                  weightedSum +=
                    normalizedScore *
                    (schoolType === "小学" && (year === "五年级" || year === "六年级") ? 0.1 : 0);
                  break;
              }
              additionalScoreSum += additionalScore;
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
              weightedSum += normalizedScore * 0.15;
              recordsToPush.push({
                recordType: "体重指数（BMI）",
                inSchool: true,
                nature: "test",
                fitnessTestId: fitnessTestId,
                score: bmi,
                isRedoOrMissingUpload: config.isRedoOrMissingUpload,
                toEntityClassification: validClassification_[0].id,
                fromEntityClassification: classificationId,
                normalizedScore: normalizedScore,
                grade: grade,
              });
            } else {
              recordsToPush.push({
                recordType: "体重指数（BMI）",
                inSchool: true,
                nature: "test",
                fitnessTestId: fitnessTestId,
                score: null,
                isRedoOrMissingUpload: config.isRedoOrMissingUpload,
                toEntityClassification: validClassification_[0].id,
                fromEntityClassification: classificationId,
                normalizedScore: null,
                grade: null,
              });
            }

            if (recordsToProcess === "all") {
              classScoresGrades[year][class_].totalAvgNormScore += weightedSum + additionalScoreSum;
              classScoresGrades[year][class_].normScore += weightedSum;
              classScoresGrades[year][class_].additionalScore += additionalScoreSum;
              classScoresGrades[year][class_].totalProcessed++;
              if (weightedSum + additionalScoreSum >= 60)
                classScoresGrades[year][class_].totalPassing++;
              if (hasAnyNonNullScore) classScoresGrades[year][class_].totalParticipating++;
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

      // update per class results
      const [fitnessTest_] = await db
        .select()
        .from(fitnessTest)
        .where(eq(fitnessTest.id, fitnessTestId))
        .limit(1);
      const newRecord = config.isRedoOrMissingUpload
        ? fitnessTest_.redoOrMissingUploadYearsAndClassesScoresGrades
        : fitnessTest_.mainUploadYearsAndClassesScoresGrades;
      // merge classScoresGrades to fitnessTest_
      for (const year in classScoresGrades) {
        for (const class_ in classScoresGrades[year]) {
          if (!newRecord[year]) newRecord[year] = {};
          if (!newRecord[year][class_]) newRecord[year][class_] = [];
          const avgScore =
            classScoresGrades[year][class_].totalAvgNormScore /
            classScoresGrades[year][class_].totalParticipating;
          const grade = findGrade(avgScore);
          newRecord[year][class_] = [
            avgScore.toFixed(1),
            grade!,
            (
              classScoresGrades[year][class_].totalPassing /
              classScoresGrades[year][class_].totalParticipating
            ).toFixed(2),
            (
              classScoresGrades[year][class_].normScore /
              classScoresGrades[year][class_].totalParticipating
            ).toFixed(1),
            (
              classScoresGrades[year][class_].additionalScore /
              classScoresGrades[year][class_].totalParticipating
            ).toFixed(1),
            classScoresGrades[year][class_].totalParticipating.toString(),
          ];
        }
      }
      console.log("newRecord: ", newRecord);
      await db
        .update(fitnessTest)
        .set(
          config.isRedoOrMissingUpload
            ? { redoOrMissingUploadYearsAndClassesScoresGrades: newRecord }
            : { mainUploadYearsAndClassesScoresGrades: newRecord }
        )
        .where(eq(fitnessTest.id, fitnessTestId));

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

          // update the mainUploadYearsAndClassesProcessed or redoOrMissingUploadYearsAndClassesProcessed
          if (config.isRedoOrMissingUpload) {
            const [{ redoOrMissingUploadYearsAndClassesProcessed }] = await tx
              .select({
                redoOrMissingUploadYearsAndClassesProcessed:
                  fitnessTest.redoOrMissingUploadYearsAndClassesProcessed,
              })
              .from(fitnessTest)
              .where(eq(fitnessTest.id, fitnessTestId))
              .limit(1);
            for (const [key, value] of Object.entries(configYearsAndClasses)) {
              if (redoOrMissingUploadYearsAndClassesProcessed.hasOwnProperty(key)) {
                redoOrMissingUploadYearsAndClassesProcessed[key] = [
                  ...new Set([...redoOrMissingUploadYearsAndClassesProcessed[key], ...value]),
                ];
              } else {
                redoOrMissingUploadYearsAndClassesProcessed[key] = value;
              }
            }
            await db
              .update(fitnessTest)
              .set({
                redoOrMissingUploadYearsAndClassesProcessed:
                  redoOrMissingUploadYearsAndClassesProcessed,
              })
              .where(eq(fitnessTest.id, fitnessTestId));
          } else {
            const [{ mainUploadYearsAndClassesProcessed }] = await tx
              .select({
                mainUploadYearsAndClassesProcessed: fitnessTest.mainUploadYearsAndClassesProcessed,
              })
              .from(fitnessTest)
              .where(eq(fitnessTest.id, fitnessTestId))
              .limit(1);
            for (const [key, value] of Object.entries(configYearsAndClasses)) {
              if (mainUploadYearsAndClassesProcessed.hasOwnProperty(key)) {
                mainUploadYearsAndClassesProcessed[key] = [
                  ...new Set([...mainUploadYearsAndClassesProcessed[key], ...value]),
                ];
              } else {
                mainUploadYearsAndClassesProcessed[key] = value;
              }
            }
            await db
              .update(fitnessTest)
              .set({
                mainUploadYearsAndClassesProcessed: mainUploadYearsAndClassesProcessed,
              })
              .where(eq(fitnessTest.id, fitnessTestId));
          }

          // file operations
          if (!config.isRedoOrMissingUpload) {
            await mergeSchoolTestFromUpload(
              Path.join(process.env.DEFAULT_OUTPUT_FILE_PATH!, "schoolTest"),
              `体测-${config.testName}-主测.xlsx`,
              validStudentRecords,
              headers
            );
            console.log(
              "File created at: ",
              Path.join(
                process.env.DEFAULT_OUTPUT_FILE_PATH!,
                "schoolTest",
                `体测-${config.testName}-主测.xlsx`
              )
            );
          } else {
            await mergeSchoolTestFromUpload(
              Path.join(process.env.DEFAULT_OUTPUT_FILE_PATH!, "schoolTest"),
              `体测-${config.testName}-补测.xlsx`,
              validStudentRecords,
              headers
            );
            console.log(
              "File created at: ",
              Path.join(
                process.env.DEFAULT_OUTPUT_FILE_PATH!,
                "schoolTest",
                `体测-${config.testName}-补测.xlsx`
              )
            );
          }
        } catch (error) {
          tx.rollback();
          throw error;
        }
      });

      const tEnd = performance.now();

      await db.insert(fileProcessMessage).values({
        fileProcessId: fileProcess_.id,
        message: `文件处理完成：${config.testName}（${
          config.isRedoOrMissingUpload ? "补测" : "主测"
        }）\n新增记录: ${
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
