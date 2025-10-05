import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  EntityType,
  fileProcess,
  fileProcessMessage,
  FileProcessMessageSeverity,
  FileProcessStatus,
  FileRequestNature,
  fitnessTest,
  record,
  testNameEnum,
} from "@/db/schema";
import { createRouter } from "@/lib/create-app";
import { schoolStudentsUpload } from "@/lib/file/schoolStudentsUpload";
import { schoolTestUpload } from "@/lib/file/schoolTestUpload";
import {
  checkValidSession,
  getQueryableYearsAndClasses,
  getYearOrder,
  mapEntityTypeToChinese,
  mapYearToChinese,
} from "@/lib/util";
import {
  downloadRawDataValidator,
  downloadSchoolTestReportsValidator,
  uploadSchoolExerciseValidator,
  uploadSchoolTestValidator,
  uploadStudentInfoValidator,
} from "@/lib/validators";
import { zValidator } from "@hono/zod-validator";
import { and, between, desc, eq, gt, sql, SQL } from "drizzle-orm";
import Path from "path";

import measureType_ from "@/data/persistent/measure_type.json";
import { createWorkbookFromJson } from "@/lib/excelOperations";
import exportSchoolTestPerClass from "@/lib/file/exportSchoolTestPerClass";
import exportSchoolTestPerStudent from "@/lib/file/exportSchoolTestPerStudent";
import exportSchoolTestPerYear from "@/lib/file/exportSchoolTestPerYear";
import exportSchoolTestWholeSchool from "@/lib/file/exportSchoolTestWholeSchool";
import exportSchoolTestWholeSchoolYearComparison from "@/lib/file/exportSchoolTestWholeSchoolYearComparison";
import { schoolExerciseUpload } from "@/lib/file/schoolExerciseUpload";

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

const router = createRouter()
  .get("/myFileProcess", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));

    const fileProcess_ = await db
      .select({
        fileProcessId: fileProcess.id,
        fileProcessStatus: fileProcess.status,
        fileProcessRequestedAt: fileProcess.requestedAt,
        fileProcessProcessStartDate: fileProcess.processStartDate,
        fileProcessProcessEndDate: fileProcess.processEndDate,
        fileProcessNature: fileProcess.fileRequestNature,
        isUpload: fileProcess.isUploadRequested,
        originalFileName: fileProcess.originalFileName,
        fileProcessMessages: {
          message: fileProcessMessage.message,
          severity: fileProcessMessage.severity,
          createdAt: fileProcessMessage.createdAt,
        },
      })
      .from(fileProcess)
      .where(eq(fileProcess.requestedByEntityId, session.activeClassifications[0].entityId))
      .leftJoin(fileProcessMessage, eq(fileProcess.id, fileProcessMessage.fileProcessId))
      .orderBy(desc(fileProcess.requestedAt));
    // group messages with same file process id
    const groupMessages: {
      fileProcessId: string;
      fileProcessStatus: FileProcessStatus;
      fileProcessRequestedAt: Date;
      fileProcessProcessStartDate: Date;
      fileProcessProcessEndDate: Date | null;
      fileProcessNature: FileRequestNature;
      isUpload: boolean;
      originalFileName: string | null;
      fileProcessMessages: {
        message: string;
        severity: FileProcessMessageSeverity;
        createdAt: Date;
      }[];
    }[] = [];
    fileProcess_.forEach((fileProcess) => {
      const existingMessage = groupMessages.find(
        (message) => message.fileProcessId === fileProcess.fileProcessId
      );
      if (existingMessage && fileProcess.fileProcessMessages) {
        existingMessage.fileProcessMessages.push({
          message: fileProcess.fileProcessMessages.message,
          severity: fileProcess.fileProcessMessages.severity,
          createdAt: fileProcess.fileProcessMessages.createdAt,
        });
      } else {
        groupMessages.push({
          ...fileProcess,
          fileProcessMessages: fileProcess.fileProcessMessages
            ? [fileProcess.fileProcessMessages]
            : [],
        });
      }
    });
    return c.json({ data: groupMessages });
  })
  .post("/schoolTest/upload", zValidator("form", uploadSchoolTestValidator), async (c) => {
    const body = c.req.valid("form");
    const file = body.file;

    const [session, entityType] = checkValidSession(c.get("session"));

    if (
      session.activeClassifications.length === 0 ||
      !session.activeClassifications[0].canUploadSchoolTest
    ) {
      throw new Error("无权上传体测数据");
    }

    const runningTestProcessing = await db
      .select({ id: fileProcess.id })
      .from(fileProcess)
      .where(
        and(
          eq(fileProcess.fileRequestNature, "schoolTest"),
          eq(fileProcess.isUploadRequested, true),
          eq(fileProcess.status, "pending"),
          gt(fileProcess.processStartDate, new Date(Date.now() - 1000 * 60 * 60 * 24))
        )
      )
      .limit(1);
    if (runningTestProcessing.length > 0) {
      throw new Error("已有正在处理的体测数据，请稍后再试");
    }

    const [existingTest] = await db
      .select({
        id: fitnessTest.id,
        mainUploadYearsAndClassesProcessed: fitnessTest.mainUploadYearsAndClassesProcessed,
      })
      .from(fitnessTest)
      .where(eq(fitnessTest.name, body.testName))
      .limit(1);
    if (
      existingTest &&
      body.isRedoOrMissingUpload &&
      Object.keys(existingTest.mainUploadYearsAndClassesProcessed).length === 0
    ) {
      throw new Error("无法上传补测数据，请先上传主测数据");
    }

    // make copy
    const copyFilePath = Path.join(
      process.env.DEFAULT_UPLOAD_FILE_PATH!,
      `体测-${body.testName}-${
        body.isRedoOrMissingUpload ? "补测" : "主测"
      }-${Date.now()}.${file.name.split(".").pop()}`
    );
    const copyLocation = Bun.file(copyFilePath);
    Bun.write(copyLocation, file);

    const processResult = await schoolTestUpload(body, file, copyFilePath, c.get("session")!);

    return c.json({ data: processResult });
  })
  .post("/schoolExercise/upload", zValidator("form", uploadSchoolExerciseValidator), async (c) => {
    const body = c.req.valid("form");
    const file = body.file;

    const [session, entityType] = checkValidSession(c.get("session"));

    if (
      session.activeClassifications.length === 0 ||
      !session.activeClassifications[0].canUploadSchoolTest // same for now
    ) {
      throw new Error("无权上传体锻数据");
    }

    // make copy
    const copyFilePath = Path.join(
      process.env.DEFAULT_UPLOAD_FILE_PATH!,
      `体锻-${body.exerciseDate.toDateString()}.${file.name.split(".").pop()}`
    );
    const copyLocation = Bun.file(copyFilePath);
    Bun.write(copyLocation, file);

    const processResult = await schoolExerciseUpload(body, file, copyFilePath, c.get("session")!);

    return c.json({ data: processResult });
  })
  .post("/studentInfo/upload", zValidator("form", uploadStudentInfoValidator), async (c) => {
    // TODO: use queue like uploads

    const body = c.req.valid("form");
    const file = body.file;

    const [session, entityType] = checkValidSession(c.get("session"));
    if (
      session.activeClassifications.length === 0 ||
      !session.activeClassifications[0].canUploadStudentInfo
    ) {
      throw new Error("无权上传学生资料");
    }

    const copyFilePath = Path.join(
      process.env.DEFAULT_UPLOAD_FILE_PATH!,
      `学生资料-${body.from}年-${body.to}年-${Date.now()}.${file.name.split(".").pop()}`
    );

    const copyLocation = Bun.file(copyFilePath);
    Bun.write(copyLocation, file);

    const processResult = await schoolStudentsUpload(body, file, copyFilePath, c.get("session")!);

    return c.json({ data: processResult });
  })
  .post("/rawData/download", zValidator("json", downloadRawDataValidator), async (c) => {
    const json = c.req.valid("json");
    const [session, entityType] = checkValidSession(c.get("session"));

    let flattened: { year: string; class: string }[] = [];
    if (json.singleEntity) {
      const [entity_] = await db
        .select({ year: classificationMap.year, class: classificationMap.class })
        .from(entity)
        .innerJoin(classification, eq(entity.id, classification.entityId))
        .innerJoin(classificationMap, eq(classification.id, classificationMap.classificationId))
        .where(eq(entity.id, json.singleEntity));
      if (!entity_ || !entity_.year || !entity_.class) {
        throw new Error("Unauthorized");
      }
      // TODO: check permission
      flattened = [{ year: entity_.year, class: entity_.class }];
    } else {
      const queryableYearsAndClasses = await getQueryableYearsAndClasses(session, entityType);
      const scope: Record<string, string[]> = {};
      for (const year in json.scopeToProcess) {
        scope[mapYearToChinese(year)] = json.scopeToProcess[year];
      }

      for (const year in scope) {
        if (!queryableYearsAndClasses[year]) {
          throw new Error("Unauthorized");
        }
        for (const class_ of scope[year]) {
          if (!queryableYearsAndClasses[year].includes(class_)) {
            throw new Error("Unauthorized");
          }
        }
      }

      flattened = Object.entries(scope)
        .map(([year, classes]) =>
          classes.map((class_) => ({
            year,
            class: class_,
          }))
        )
        .flat();
    }

    const fromDate = new Date(json.from);
    const toDate = new Date(json.to);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    const conditions: SQL[] = [
      eq(record.inSchool, json.inSchool),
      between(record.createdAt, fromDate, toDate),
      eq(record.nature, json.nature),
    ];
    if (json.singleEntity) {
      conditions.push(eq(entity.id, json.singleEntity));
    }
    const allClassification = db
      .select({
        id: classification.id,
        year: classificationMap.year,
        class: classificationMap.class,
        entityId: classification.entityId,
      })
      .from(classification)
      .innerJoin(classificationMap, eq(classification.id, classificationMap.classificationId))
      .innerJoin(
        sql`(VALUES ${sql.join(
          flattened.map(({ year, class: class_ }) => sql`(${year}, ${class_})`),
          sql`, `
        )}) AS constraints(year, class)`,
        sql`constraints.year = classification_map.year AND constraints.class = classification_map.class`
      )
      .as("all_classification") as any;

    const query = db
      .select({
        recordType: record.recordType,
        inSchool: record.inSchool,
        nature: record.nature,
        entity: entity.name,
        score: record.score,
        exerciseDuration: record.exerciseDuration,
        grade: record.grade,
        isRedoOrMissingUpload: record.isRedoOrMissingUpload,
        normalizedScore: record.normalizedScore,
        additionalScore: record.additionalScore,
        duration: record.exerciseDuration,
        createdAt: record.createdAt,
        fitnessTest: fitnessTest.name,
        year: allClassification.year,
        class: allClassification.class,
        internalId: entity.internalId,
        entityType: entity.entityType,
      })
      .from(record)
      .where(and(...conditions))
      .innerJoin(allClassification, eq(record.toEntityClassification, allClassification.id))
      .innerJoin(entity, eq(allClassification.entityId, entity.id))
      .leftJoin(fitnessTest, eq(record.fitnessTestId, fitnessTest.id))
      .orderBy(desc(record.createdAt))
      .prepare("insane query");

    const results = await query.execute();

    let responseBuffer: ArrayBuffer = new ArrayBuffer(0);
    // TODO: mental
    if (json.nature === "test") {
      const mappedResultsByStudent: Record<string, Record<string, any>> = {};
      const nameToUnitMap: Record<string, [string, boolean]> = {};
      for (const measure of measureType) {
        nameToUnitMap[measure.testName] = [measure.unit, measure.isCalculatedAndReported];
      }
      for (const result of results) {
        if (!testNameEnum.enumValues.includes(result.recordType as any)) {
          // TODO: LOG WARNING
          console.warn(`${result.recordType} is not a valid test subject`);
          continue;
        }
        mappedResultsByStudent[
          `${result.internalId}-${result.fitnessTest}-${result.isRedoOrMissingUpload ? "0" : "1"}`
        ] = {
          ...(mappedResultsByStudent[
            `${result.internalId}-${result.fitnessTest}-${result.isRedoOrMissingUpload ? "0" : "1"}`
          ] ?? {
            类型: "校内体测",
            年级: result.year,
            班级: result.class,
            姓名: result.entity,
            身份: mapEntityTypeToChinese(result.entityType as EntityType),
            体测名字: result.fitnessTest,
            "补测/重测": result.isRedoOrMissingUpload ? "是" : "否",
            创建时间: result.createdAt,
          }),
          [`${result.recordType}(${nameToUnitMap[result.recordType][0]})`]: result.score,
          ...(nameToUnitMap[result.recordType][1] && {
            [`${result.recordType}得分`]: result.normalizedScore,
            [`${result.recordType}加分`]: result.additionalScore,
            [`${result.recordType}总分`]:
              result.normalizedScore && result.normalizedScore + (result.additionalScore ?? 0),
            [`${result.recordType}等级`]: result.grade,
          }),
        };
      }

      responseBuffer = await createWorkbookFromJson(
        Object.values(mappedResultsByStudent).toSorted((a, b) => {
          if (a.年级 === b.年级) {
            const numA = parseInt(a.班级.split("班")[0]);
            const numB = parseInt(b.班级.split("班")[0]);
            return numA - numB;
          }
          // compare year order
          return getYearOrder(a.年级) - getYearOrder(b.年级);
        }),
        "数据导出",
        {
          "7": {
            t: "s",
          },
        }
      );
    } else if (json.nature === "exercise") {
      const nameToUnitMap: Record<string, [string, boolean]> = {};
      for (const measure of measureType) {
        if (!measure.exerciseName) continue;
        nameToUnitMap[measure.exerciseName] = [measure.unit, measure.isCalculatedAndReported];
      }

      responseBuffer = await createWorkbookFromJson(
        results.map((result) => ({
          类型: "校内体测",
          年级: result.year,
          班级: result.class,
          姓名: result.entity,
          身份: mapEntityTypeToChinese(result.entityType as EntityType),
          体测名字: result.fitnessTest,
          创建时间: result.createdAt,
          项目: `${result.recordType}(${nameToUnitMap[result.recordType][0]})`,
          [`${result.recordType}锻炼时间`]: result.exerciseDuration,
          [`${result.recordType}得分`]: result.normalizedScore,
          [`${result.recordType}加分`]: result.additionalScore,
          [`${result.recordType}总分`]:
            result.normalizedScore && result.normalizedScore + (result.additionalScore ?? 0),
          [`${result.recordType}等级`]: result.grade,
        })),
        "数据导出",
        {
          "6": {
            t: "s",
          },
        }
      );
    }
    const res = new Response(Buffer.from(responseBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=export.xlsx`,
      },
    });
    return res;
  })
  .post(
    "/schoolTestReports/download",
    zValidator("json", downloadSchoolTestReportsValidator),
    async (c) => {
      const json = c.req.valid("json");
      const [session, entityType] = checkValidSession(c.get("session"));

      let fileData: ArrayBuffer | null = null;

      console.log("Downloading school test reports", JSON.stringify(json, null, 2));
      switch (json.reportsToProcess) {
        case "全校成绩总表":
          if (
            session.activeClassifications.length === 0 ||
            !session.activeClassifications[0].canAccessSchoolInClassification
          ) {
            throw new Error("Unauthorized");
          }
          fileData = await exportSchoolTestWholeSchool(
            json.schoolTestId,
            session.allClassifications[0].schoolId,
            json.includeIsRedoOrMissingUpload
          );
          break;
        case "班级排名统计表":
          if (
            session.activeClassifications.length === 0 ||
            !session.activeClassifications[0].canAccessSchoolInClassification
          ) {
            throw new Error("Unauthorized");
          }
          fileData = await exportSchoolTestWholeSchoolYearComparison(
            json.schoolTestId,
            session.allClassifications[0].schoolId,
            json.includeIsRedoOrMissingUpload
          );
          break;
        case "年级成绩总表":
          if (
            session.activeClassifications.length === 0 ||
            (!session.activeClassifications[0].canAccessYearInClassification &&
              !session.activeClassifications[0].canAccessSchoolInClassification)
          ) {
            throw new Error("Unauthorized");
          }
          fileData = await exportSchoolTestPerYear(
            json.schoolTestId,
            session.allClassifications[0].schoolId,
            json.includeIsRedoOrMissingUpload,
            json.year!
          );
          break;
        case "班级成绩总表":
          if (
            session.activeClassifications.length === 0 ||
            (!session.activeClassifications[0].canAccessClassInClassification &&
              !session.activeClassifications[0].canAccessYearInClassification &&
              !session.activeClassifications[0].canAccessSchoolInClassification)
          ) {
            throw new Error("Unauthorized");
          }
          fileData = await exportSchoolTestPerClass(
            json.schoolTestId,
            session.allClassifications[0].schoolId,
            json.includeIsRedoOrMissingUpload,
            json.year!,
            json.class!
          );
          break;
        case "个人成绩单":
          // TODO
          if (!json.entityId) {
            throw new Error("Unauthorized");
          } else if (
            session.activeClassifications[0].entityType === "student" &&
            json.entityId !== session.allClassifications[0].entityId
          ) {
            throw new Error("Unauthorized");
          } else if (session.activeClassifications[0].entityType === "parent") {
            const children = await db
              .select({
                entityId: entity.id,
              })
              .from(entity)
              .where(eq(entity.isChildOf, session.allClassifications[0].entityId));
            if (!children.some((child) => child.entityId === json.entityId)) {
              throw new Error("Unauthorized");
            }
          }
          fileData = await exportSchoolTestPerStudent(
            json.schoolTestId,
            session.allClassifications[0].schoolId,
            json.includeIsRedoOrMissingUpload,
            json.entityId!
          );
          break;
      }

      if (fileData === null) {
        throw new Error("系统错误，请重新刷新页面后重试");
      }

      const res = new Response(Buffer.from(fileData), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=export.xlsx`,
        },
      });
      return res;
    }
  );

export default router;
