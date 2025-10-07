import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fitnessTest,
  record,
  school,
} from "@/db/schema";
import { DEFAULT_OUTDATED_DAY, DEFAULT_OUTDATED_MONTH } from "@/lib/const";
import { createRouter } from "@/lib/create-app";
import {
  checkValidClassification,
  checkValidSession,
  findGrade,
  findTestBMIScoreAndGrade,
  findTestScores,
} from "@/lib/util";
import { getRecordsQueryValidator, uploadHomeExerciseValidator } from "@/lib/validators";
import withQueryableId from "@/middlewares/with-queryable-id";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt, InferInsertModel, lte, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 } from "uuid";

import measureType_ from "@/data/persistent/measure_type.json";

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
// for ts rpc to infer types, do NOT break the chain and do NOT use middleware globally

const router = createRouter()
  .get("/all", zValidator("query", getRecordsQueryValidator), withQueryableId, async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));

    // TODO: factor permission manager
    if (!c.get("permissionManager")) {
      throw new Error("Unauthorized");
    }

    const queryParams = c.req.valid("query");

    const toClassification = alias(classification, "toClassification");
    const fromClassification = alias(classification, "fromClassification");
    const toClassificationMap = alias(classificationMap, "toClassificationMap");
    const fromClassificationMap = alias(classificationMap, "fromClassificationMap");
    const toEntity = alias(entity, "toEntity");
    const fromEntity = alias(entity, "fromEntity");
    const toSchool = alias(school, "toSchool");
    const fromSchool = alias(school, "fromSchool");

    let query = db
      .select({
        recordId: record.id,
        recordToEntity: {
          classificationId: toClassification.id,
          schoolName: toSchool.name,
          schoolType: toSchool.schoolType,
          year: toClassificationMap.year,
          class: toClassificationMap.class,
          // classNumber: toClassificationMap.classNumber,
          name: toEntity.name,
          isChildOf: toEntity.isChildOf,
          entityId: toEntity.id,
          internalId: toEntity.internalId,
          gender: toEntity.gender,
        },
        recordFromEntity: {
          classificationId: fromClassification.id,
          schoolName: fromSchool.name,
          schoolType: fromSchool.schoolType,
          year: fromClassificationMap.year,
          class: fromClassificationMap.class,
          // classNumber: fromClassificationMap.classNumber,
          name: fromEntity.name,
          isChildOf: fromEntity.isChildOf,
          entityId: fromEntity.id,
          internalId: fromEntity.internalId,
          gender: fromEntity.gender,
        },
        recordType: record.recordType,
        normalizedScore: record.normalizedScore,
        additionalScore: record.additionalScore,
        exerciseDuration: record.exerciseDuration,
        inSchool: record.inSchool,
        nature: record.nature,
        score: record.score,
        videoUrl: record.videoUrl,
        grade: record.grade,
        isRedoOrMissingUpload: record.isRedoOrMissingUpload,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })
      .from(record)
      .innerJoin(toClassification, eq(record.toEntityClassification, toClassification.id))
      .innerJoin(fromClassification, eq(record.fromEntityClassification, fromClassification.id))
      .innerJoin(toEntity, eq(toClassification.entityId, toEntity.id))
      .innerJoin(fromEntity, eq(fromClassification.entityId, fromEntity.id))
      .innerJoin(toClassificationMap, eq(toClassification.id, toClassificationMap.classificationId))
      .innerJoin(
        fromClassificationMap,
        eq(fromClassification.id, fromClassificationMap.classificationId)
      )
      .innerJoin(toSchool, eq(toClassification.schoolId, toSchool.id))
      .innerJoin(fromSchool, eq(fromClassification.schoolId, fromSchool.id))
      .$dynamic();

    const whereClause: SQL[] = [];
    whereClause.push(eq(record.isRedoOrMissingUpload, false));

    if (queryParams.classificationValidFromYear) {
      whereClause.push(
        gt(
          toClassification.validTo,
          new Date(
            parseInt(queryParams.classificationValidFromYear),
            DEFAULT_OUTDATED_MONTH,
            DEFAULT_OUTDATED_DAY
          )
        )
      );
    }

    if (queryParams.classificationValidToYear) {
      whereClause.push(
        lte(
          toClassification.validTo,
          new Date(
            parseInt(queryParams.classificationValidToYear),
            DEFAULT_OUTDATED_MONTH,
            DEFAULT_OUTDATED_DAY
          )
        )
      );
    }

    query = query.where(and(...whereClause));

    let results = await query.prepare(v4()).execute();

    results = results.filter((result) => {
      return c
        .get("permissionManager")
        .queryableClassificationIds.includes(result.recordToEntity.classificationId);
    });

    return c.json({
      data: results,
    });
  })
  .get("/schoolTest", zValidator("query", getRecordsQueryValidator), async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));

    const queryParams = c.req.valid("query");

    const toClassification = alias(classification, "toClassification");
    const fromClassification = alias(classification, "fromClassification");
    const toClassificationMap = alias(classificationMap, "toClassificationMap");
    const fromClassificationMap = alias(classificationMap, "fromClassificationMap");
    const toEntity = alias(entity, "toEntity");
    const fromEntity = alias(entity, "fromEntity");
    const toSchool = alias(school, "toSchool");
    const fromSchool = alias(school, "fromSchool");
    // TODO: add in type as student for filtering

    let query = db
      .select({
        recordId: record.id,
        recordToEntity: {
          classificationId: toClassification.id,
          schoolName: toSchool.name,
          schoolType: toSchool.schoolType,
          year: toClassificationMap.year,
          class: toClassificationMap.class,
          // classNumber: toClassificationMap.classNumber,
          name: toEntity.name,
          isChildOf: toEntity.isChildOf,
          entityId: toEntity.id,
          internalId: toEntity.internalId,
          gender: toEntity.gender,
        },
        recordFromEntity: {
          classificationId: fromClassification.id,
          schoolName: fromSchool.name,
          schoolType: fromSchool.schoolType,
          year: fromClassificationMap.year,
          class: fromClassificationMap.class,
          // classNumber: fromClassificationMap.classNumber,
          name: fromEntity.name,
          isChildOf: fromEntity.isChildOf,
          entityId: fromEntity.id,
          internalId: fromEntity.internalId,
          gender: fromEntity.gender,
        },
        recordType: record.recordType,
        normalizedScore: record.normalizedScore,
        additionalScore: record.additionalScore,
        exerciseDuration: record.exerciseDuration,
        fitnessTestId: record.fitnessTestId,
        fitnessTestName: fitnessTest.name,
        inSchool: record.inSchool,
        nature: record.nature,
        score: record.score,
        videoUrl: record.videoUrl,
        grade: record.grade,
        isRedoOrMissingUpload: record.isRedoOrMissingUpload,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })
      .from(record)
      .innerJoin(toClassification, eq(record.toEntityClassification, toClassification.id))
      .innerJoin(fromClassification, eq(record.fromEntityClassification, fromClassification.id))
      .innerJoin(toEntity, eq(toClassification.entityId, toEntity.id))
      .innerJoin(fromEntity, eq(fromClassification.entityId, fromEntity.id))
      .innerJoin(toClassificationMap, eq(toClassification.id, toClassificationMap.classificationId))
      .innerJoin(
        fromClassificationMap,
        eq(fromClassification.id, fromClassificationMap.classificationId)
      )
      .innerJoin(toSchool, eq(toClassification.schoolId, toSchool.id))
      .innerJoin(fromSchool, eq(fromClassification.schoolId, fromSchool.id))
      .innerJoin(fitnessTest, eq(record.fitnessTestId, fitnessTest.id))
      .$dynamic();

    const whereClause: SQL[] = [];

    whereClause.push(eq(record.inSchool, true));
    whereClause.push(eq(record.nature, "test"));
    whereClause.push(eq(record.isRedoOrMissingUpload, false));

    if (queryParams.classificationValidFromYear) {
      whereClause.push(
        gt(
          toClassification.validTo,
          new Date(
            parseInt(queryParams.classificationValidFromYear),
            DEFAULT_OUTDATED_MONTH,
            DEFAULT_OUTDATED_DAY
          )
        )
      );
    }

    if (queryParams.classificationValidToYear) {
      whereClause.push(
        lte(
          toClassification.validTo,
          new Date(
            parseInt(queryParams.classificationValidToYear),
            DEFAULT_OUTDATED_MONTH,
            DEFAULT_OUTDATED_DAY
          )
        )
      );
    }

    query = query.where(and(...whereClause));

    let results = await query.prepare(v4()).execute();

    // results = results.filter((result) => {
    //   return c
    //     .get("permissionManager")
    //     .queryableClassificationIds.includes(result.recordToEntity.classificationId);
    // });

    return c.json({
      data: results,
    });
  })
  .get(
    "/schoolExercise",
    zValidator("query", getRecordsQueryValidator),
    withQueryableId,
    async (c) => {
      const [session, entityType] = checkValidSession(c.get("session"));
      if (!c.get("permissionManager")) {
        throw new Error("Unauthorized");
      }

      const queryParams = c.req.valid("query");

      const toClassification = alias(classification, "toClassification");
      const fromClassification = alias(classification, "fromClassification");
      const toClassificationMap = alias(classificationMap, "toClassificationMap");
      const fromClassificationMap = alias(classificationMap, "fromClassificationMap");
      const toEntity = alias(entity, "toEntity");
      const fromEntity = alias(entity, "fromEntity");
      const toSchool = alias(school, "toSchool");
      const fromSchool = alias(school, "fromSchool");

      // TODO: add in type as student for filtering

      let query = db
        .select({
          recordId: record.id,
          recordToEntity: {
            classificationId: toClassification.id,
            schoolName: toSchool.name,
            schoolType: toSchool.schoolType,
            year: toClassificationMap.year,
            class: toClassificationMap.class,
            // classNumber: toClassificationMap.classNumber,
            name: toEntity.name,
            isChildOf: toEntity.isChildOf,
            entityId: toEntity.id,
            internalId: toEntity.internalId,
            gender: toEntity.gender,
          },
          recordFromEntity: {
            classificationId: fromClassification.id,
            schoolName: fromSchool.name,
            schoolType: fromSchool.schoolType,
            year: fromClassificationMap.year,
            class: fromClassificationMap.class,
            // classNumber: fromClassificationMap.classNumber,
            name: fromEntity.name,
            isChildOf: fromEntity.isChildOf,
            entityId: fromEntity.id,
            internalId: fromEntity.internalId,
            gender: fromEntity.gender,
          },
          recordType: record.recordType,
          normalizedScore: record.normalizedScore,
          additionalScore: record.additionalScore,
          exerciseDuration: record.exerciseDuration,
          inSchool: record.inSchool,
          nature: record.nature,
          score: record.score,
          exerciseScore: record.exerciseScore,
          exerciseDate: record.exerciseDate,
          videoUrl: record.videoUrl,
          grade: record.grade,
          isRedoOrMissingUpload: record.isRedoOrMissingUpload,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
        .from(record)
        .innerJoin(toClassification, eq(record.toEntityClassification, toClassification.id))
        .innerJoin(fromClassification, eq(record.fromEntityClassification, fromClassification.id))
        .innerJoin(toEntity, eq(toClassification.entityId, toEntity.id))
        .innerJoin(fromEntity, eq(fromClassification.entityId, fromEntity.id))
        .innerJoin(
          toClassificationMap,
          eq(toClassification.id, toClassificationMap.classificationId)
        )
        .innerJoin(
          fromClassificationMap,
          eq(fromClassification.id, fromClassificationMap.classificationId)
        )
        .innerJoin(toSchool, eq(toClassification.schoolId, toSchool.id))
        .innerJoin(fromSchool, eq(fromClassification.schoolId, fromSchool.id))
        .$dynamic();

      const whereClause: SQL[] = [];

      whereClause.push(eq(record.inSchool, true));
      whereClause.push(eq(record.nature, "exercise"));

      if (queryParams.classificationValidFromYear) {
        whereClause.push(
          gt(
            toClassification.validTo,
            new Date(
              parseInt(queryParams.classificationValidFromYear),
              DEFAULT_OUTDATED_MONTH,
              DEFAULT_OUTDATED_DAY
            )
          )
        );
      }

      if (queryParams.classificationValidToYear) {
        whereClause.push(
          lte(
            toClassification.validTo,
            new Date(
              parseInt(queryParams.classificationValidToYear),
              DEFAULT_OUTDATED_MONTH,
              DEFAULT_OUTDATED_DAY
            )
          )
        );
      }

      query = query.where(and(...whereClause));

      let results = await query.prepare(v4()).execute();

      results = results.filter((result) => {
        return c
          .get("permissionManager")
          .queryableClassificationIds.includes(result.recordToEntity.classificationId);
      });

      return c.json({
        data: results,
      });
    }
  )
  .get(
    "/homeExercise",
    zValidator("query", getRecordsQueryValidator),
    withQueryableId,
    async (c) => {
      const [session, entityType] = checkValidSession(c.get("session"));
      if (!c.get("permissionManager")) {
        throw new Error("Unauthorized");
      }

      const queryParams = c.req.valid("query");

      const toClassification = alias(classification, "toClassification");
      const fromClassification = alias(classification, "fromClassification");
      const toClassificationMap = alias(classificationMap, "toClassificationMap");
      const fromClassificationMap = alias(classificationMap, "fromClassificationMap");
      const toEntity = alias(entity, "toEntity");
      const fromEntity = alias(entity, "fromEntity");
      const toSchool = alias(school, "toSchool");
      const fromSchool = alias(school, "fromSchool");
      // TODO: add in type as student for filtering

      let query = db
        .select({
          recordId: record.id,
          recordToEntity: {
            classificationId: toClassification.id,
            schoolName: toSchool.name,
            schoolType: toSchool.schoolType,
            year: toClassificationMap.year,
            class: toClassificationMap.class,
            // classNumber: toClassificationMap.classNumber,
            name: toEntity.name,
            isChildOf: toEntity.isChildOf,
            entityId: toEntity.id,
            internalId: toEntity.internalId,
            gender: toEntity.gender,
          },
          recordFromEntity: {
            classificationId: fromClassification.id,
            schoolName: fromSchool.name,
            schoolType: fromSchool.schoolType,
            year: fromClassificationMap.year,
            class: fromClassificationMap.class,
            // classNumber: fromClassificationMap.classNumber,
            name: fromEntity.name,
            isChildOf: fromEntity.isChildOf,
            entityId: fromEntity.id,
            internalId: fromEntity.internalId,
            gender: fromEntity.gender,
          },
          recordType: record.recordType,
          normalizedScore: record.normalizedScore,
          additionalScore: record.additionalScore,
          exerciseDuration: record.exerciseDuration,
          inSchool: record.inSchool,
          nature: record.nature,
          score: record.score,
          exerciseScore: record.exerciseScore,
          exerciseDate: record.exerciseDate,
          videoUrl: record.videoUrl,
          grade: record.grade,
          isRedoOrMissingUpload: record.isRedoOrMissingUpload,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
        .from(record)
        .innerJoin(toClassification, eq(record.toEntityClassification, toClassification.id))
        .innerJoin(fromClassification, eq(record.fromEntityClassification, fromClassification.id))
        .innerJoin(toEntity, eq(toClassification.entityId, toEntity.id))
        .innerJoin(fromEntity, eq(fromClassification.entityId, fromEntity.id))
        .innerJoin(
          toClassificationMap,
          eq(toClassification.id, toClassificationMap.classificationId)
        )
        .innerJoin(
          fromClassificationMap,
          eq(fromClassification.id, fromClassificationMap.classificationId)
        )
        .innerJoin(toSchool, eq(toClassification.schoolId, toSchool.id))
        .innerJoin(fromSchool, eq(fromClassification.schoolId, fromSchool.id))
        .$dynamic();

      const whereClause: SQL[] = [];

      whereClause.push(eq(record.inSchool, false));
      whereClause.push(eq(record.nature, "exercise"));

      if (queryParams.classificationValidFromYear) {
        whereClause.push(
          gt(
            toClassification.validTo,
            new Date(
              parseInt(queryParams.classificationValidFromYear),
              DEFAULT_OUTDATED_MONTH,
              DEFAULT_OUTDATED_DAY
            )
          )
        );
      }

      if (queryParams.classificationValidToYear) {
        whereClause.push(
          lte(
            toClassification.validTo,
            new Date(
              parseInt(queryParams.classificationValidToYear),
              DEFAULT_OUTDATED_MONTH,
              DEFAULT_OUTDATED_DAY
            )
          )
        );
      }

      query = query.where(and(...whereClause));

      let results = await query.prepare(v4()).execute();
      results = results.filter((result) => {
        return c
          .get("permissionManager")
          .queryableClassificationIds.includes(result.recordToEntity.classificationId);
      });

      return c.json({
        data: results,
      });
    }
  )
  .post("/homeExercise", zValidator("json", uploadHomeExerciseValidator), async (c) => {
    const json = c.req.valid("json");
    const [session, entityType] = checkValidSession(c.get("session"));

    if (session.activeClassifications.length === 0) {
      throw new Error("Unauthorized");
    }

    let error: string | null = null;
    try {
      const measure = measureType.find((measure) => measure.exerciseName === json.recordType);
      if (!measure) {
        throw new Error("Measure type not found");
      }
      const toEntityClassification = await db
        .select()
        .from(classification)
        .where(eq(classification.entityId, json.toEntityId));
      if (toEntityClassification.length === 0) {
        throw new Error("To entity classification not found");
      }
      const activeClassification = toEntityClassification.filter((classification) =>
        checkValidClassification(classification)
      );
      // "体重指数（BMI）" | "50米跑" | "坐位体前屈" | "50米×8往返跑" | "立定跳远" | "引体向上" | "1000米跑" | "800米跑" | "跳绳" | "仰卧起坐"
      let calculatedScore: number | undefined = json.score;
      switch (json.recordType) {
        case "50米跑":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = ((json.exerciseDuration * 60) / json.score) * 50;
          break;
        case "50米×8往返跑":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = ((json.exerciseDuration * 60) / json.score) * 50 * 8;
          break;
        case "仰卧起坐":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = json.score / json.exerciseDuration;
          break;
        case "引体向上":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = json.score / json.exerciseDuration;
          break;
        case "1000米跑":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = ((json.exerciseDuration * 60) / json.score) * 1000;
          break;
        case "800米跑":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = ((json.exerciseDuration * 60) / json.score) * 800;
          break;
        case "跳绳":
          if (!json.score || !json.exerciseDuration) {
            throw new Error("需要同时填写运动成绩和运动耗时");
          }
          calculatedScore = json.score / json.exerciseDuration;
          break;
        default:
          break;
      }
      if (!calculatedScore) {
        throw new Error("需要同时填写运动成绩和运动耗时");
      }
      let normalizedScore_: number = 0;
      let additionalScore_: number = 0;
      if (measure.testName === "体重指数（BMI）") {
        const { normalizedScore } = findTestBMIScoreAndGrade(
          calculatedScore,
          session.allClassifications[0].gender,
          session.allClassifications[0].schoolType,
          session.allClassifications[0].year || "六年级"
        );
        normalizedScore_ = normalizedScore;
      } else {
        const { normalizedScore, additionalScore } = findTestScores(
          calculatedScore,
          measure.testName,
          session.allClassifications[0].gender,
          session.allClassifications[0].schoolType,
          session.allClassifications[0].year || "六年级",
          measure.compareDirection
        );
        normalizedScore_ = normalizedScore;
        additionalScore_ = additionalScore;
      }
      const record_: InferInsertModel<typeof record> = {
        ...json,
        nature: "exercise",
        inSchool: false,
        score: calculatedScore,
        normalizedScore: normalizedScore_,
        additionalScore: additionalScore_,
        grade: findGrade(normalizedScore_),
        // TODO: check permission
        toEntityClassification:
          activeClassification.length > 0
            ? activeClassification[0].id
            : toEntityClassification[0].id,
        fromEntityClassification: session.activeClassifications[0].classificationId,
      };
      await db.insert(record).values(record_);
    } catch (e) {
      error = e instanceof Error ? e.message : (e as string);
      console.error(e);
    }

    if (error) {
      return c.json(
        {
          message: error,
        },
        500
      );
    }

    return c.json({
      message: "Exercise record uploaded successfully",
    });
  })
  .delete("/homeExercise/:id", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));
    const existingRecord = await db
      .select()
      .from(record)
      .where(eq(record.id, c.req.param("id")));
    if (existingRecord.length === 0) {
      throw new Error("Record not found");
    }
    await db.delete(record).where(eq(record.id, c.req.param("id")));
    return c.json({
      message: "Exercise record deleted successfully",
    });
  });

export default router;
