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
  getAllYearsAndClasses,
  getPermission,
  getQueryableYearsAndClasses,
  getYearOrder,
} from "@/lib/util";
import { getRecordsQueryValidator, uploadHomeExerciseValidator } from "@/lib/validators";
import withQueryableId from "@/middlewares/with-queryable-id";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt, inArray, InferInsertModel, lte, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 } from "uuid";

import measureType_ from "@/data/persistent/measure_type.json";
import getSchoolTestData from "@/lib/getRecordData/getSchoolTestData";

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
    const { canSeeWholeSchool } = getPermission(session);
    if (!canSeeWholeSchool) {
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
        recordType: record.recordType,
        normalizedScore: record.normalizedScore,
        additionalScore: record.additionalScore,
        fitnessTestId: record.fitnessTestId,
        fitnessTestName: fitnessTest.name,
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
  .get("/schoolTest/self", async (c) => {
    const queryParams = c.req.queries("testName");
    const [session, entityType] = checkValidSession(c.get("session"));
    const { canSeeSelf } = getPermission(session);
    if (!canSeeSelf) {
      throw new Error("Unauthorized");
    }
    const fitnessTestChosen = queryParams || [];
    const testData = await db
      .select()
      .from(fitnessTest)
      .where(inArray(fitnessTest.name, fitnessTestChosen));
    if (testData.length !== fitnessTestChosen.length) {
      throw new Error("Fitness test not found");
    }
    const schoolTestData_ = await getSchoolTestData(({ fitnessTest }) => {
      return [inArray(fitnessTest.name, fitnessTestChosen)];
    });
    const classData = schoolTestData_.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      const class_ = record.recordToEntity.class;
      if (!fitnessTestName || !year || !class_) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = {};
      }
      if (!acc[fitnessTestName][year][class_]) {
        acc[fitnessTestName][year][class_] = [];
      }
      acc[fitnessTestName][year][class_].push(record);
      return acc;
    }, {} as Record<string, Record<string, Record<string, typeof schoolTestData_>>>);
    const data = schoolTestData_
      .filter(
        (record) => record.recordToEntity.entityId === session!.allClassifications[0].entityId
      )
      .reduce((acc, record) => {
        const fitnessTestName = record.fitnessTestName;
        if (!fitnessTestName) return acc;
        if (!acc[fitnessTestName]) {
          acc[fitnessTestName] = [];
        }
        acc[fitnessTestName].push(record);
        return acc;
      }, {} as Record<string, typeof schoolTestData_>);

    const FRONTEND_EXERCISE_TYPES = [
      "体重指数（BMI）",
      "肺活量",
      "50米跑",
      "坐位体前屈",
      "一分钟跳绳",
      "一分钟仰卧起坐",
      "50米×8往返跑",
    ];

    const bmi = (() => {
      const r = {
        score: "--",
        grade: "--",
        height: "--",
        weight: "--",
        classAverage: "--",
      };
      if (
        fitnessTestChosen.length === 0 ||
        !Object.keys(data).includes(fitnessTestChosen[0]) ||
        !Object.keys(classData).includes(fitnessTestChosen[0])
      )
        return r;
      r.score =
        data[fitnessTestChosen[0]]
          .find((m) => m.recordType === "体重指数（BMI）")
          ?.score?.toFixed(1) ?? "--";
      r.grade =
        data[fitnessTestChosen[0]].find((m) => m.recordType === "体重指数（BMI）")?.grade ?? "--";
      r.height =
        data[fitnessTestChosen[0]].find((m) => m.recordType === "身高")?.score?.toFixed(1) ?? "--";
      r.weight =
        data[fitnessTestChosen[0]].find((m) => m.recordType === "体重")?.score?.toFixed(1) ?? "--";
      if (
        session.activeClassifications.length > 0 &&
        session.activeClassifications[0].year &&
        session.activeClassifications[0].class
      ) {
        const bmiRecords = classData[fitnessTestChosen[0]]?.[
          session.activeClassifications[0].year
        ]?.[session.activeClassifications[0].class]?.filter(
          (m) => m.recordType === "体重指数（BMI）"
        );
        if (bmiRecords && bmiRecords.length > 0) {
          const classSum = bmiRecords?.reduce((acc, curr) => {
            return acc + (curr.score ?? 0);
          }, 0);
          const classAverage = classSum / bmiRecords?.length;
          r.classAverage = classAverage.toFixed(1);
        }
      }

      return r;
    })();

    const overallBar = (() => {
      const r: { label: string; date: Date; data: (number | null)[] }[] = [];
      for (const key of Object.keys(data)) {
        if (!fitnessTestChosen.includes(key)) continue;
        const item = data[key as keyof typeof data];
        r.push({
          label: key,
          date: new Date(testData.find((item) => item.id === key)?.fitnessTestDate ?? new Date()),
          data: FRONTEND_EXERCISE_TYPES.map(
            (type) => item.find((item) => item.recordType === type)?.normalizedScore ?? null
          ).filter((m) => m !== null),
        });
      }
      return r;
    })();

    const overalBarPassingRate = (() => {
      if (
        fitnessTestChosen.length === 0 ||
        !overallBar.find((m) => m.label === fitnessTestChosen[0])
      )
        return "--";
      const total = overallBar
        .find((m) => m.label === fitnessTestChosen[0])
        ?.data.filter((m) => m !== null)! as number[];
      return ((total.filter((m) => m >= 60).length / total.length) * 100).toFixed(1) + "%";
    })();

    const overallRadar = (() => {
      const r: { label: string; date: Date; data: (number | null)[] }[] = [];
      for (const key of Object.keys(data)) {
        if (!fitnessTestChosen.includes(key)) continue;
        const item = data[key as keyof typeof data];
        r.push({
          label: key,
          date: new Date(testData.find((item) => item.id === key)?.fitnessTestDate ?? new Date()),
          data: FRONTEND_EXERCISE_TYPES.map(
            (type) => item.find((item) => item.recordType === type)?.normalizedScore ?? 0
          ),
        });
      }
      return r;
    })();

    const singleScore = (() => {
      return FRONTEND_EXERCISE_TYPES.filter((type) => type !== "体重指数（BMI）").map((type) => {
        const r = {
          score: "--",
          grade: "--",
          classAverage: "--",
          type,
        };
        if (
          fitnessTestChosen.length === 0 ||
          !Object.keys(data).includes(fitnessTestChosen[0]) ||
          !Object.keys(classData).includes(fitnessTestChosen[0])
        )
          return r;
        r.score =
          data[fitnessTestChosen[0]]
            .find((m) => m.recordType === type)
            ?.normalizedScore?.toFixed(1) ?? "--";
        r.grade = data[fitnessTestChosen[0]].find((m) => m.recordType === type)?.grade ?? "--";
        if (
          session &&
          session.activeClassifications.length > 0 &&
          session.activeClassifications[0].year &&
          session.activeClassifications[0].class
        ) {
          const classRecords = classData[fitnessTestChosen[0]]?.[
            session.activeClassifications[0].year
          ]?.[session.activeClassifications[0].class]?.filter((m) => m.recordType === type);
          if (classRecords && classRecords.length > 0) {
            const classSum = classRecords?.reduce((acc, curr) => {
              return acc + (curr.normalizedScore ?? 0);
            }, 0);
            const classAverage = classSum / classRecords?.length;
            r.classAverage = classAverage.toFixed(1);
          }
        }
        return r;
      });
    })();

    return c.json({
      data: {
        bmi,
        overallBar,
        overalBarPassingRate,
        overallRadar,
        singleScore,
      },
    });
  })
  .get("/schoolTest/class", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));
    const { canSeeWholeClass } = getPermission(session);
    if (!canSeeWholeClass) {
      throw new Error("Unauthorized");
    }
    const queryableYearsAndClasses = await getQueryableYearsAndClasses(session, entityType);
    const fitnessTestChosen = c.req.queries("testName") || [];
    const yearClassChosen = c.req.query("class") || null;
    if (!yearClassChosen) {
      throw new Error("Class not found");
    }
    const year = yearClassChosen.slice(0, 3);
    const class_ = yearClassChosen.slice(3);
    if (!queryableYearsAndClasses[year] || !queryableYearsAndClasses[year].includes(class_)) {
      throw new Error("Unauthorized");
    }
    const testData = await db
      .select()
      .from(fitnessTest)
      .where(inArray(fitnessTest.name, fitnessTestChosen));
    const allYearsAndClasses = await getAllYearsAndClasses(session.allClassifications[0].schoolId);
    if (testData.length !== fitnessTestChosen.length) {
      throw new Error("Fitness test not found");
    }
    const schoolTestData_ = await getSchoolTestData(({ fitnessTest }) => {
      return [inArray(fitnessTest.name, fitnessTestChosen)];
    });
    const data = schoolTestData_.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      const class_ = record.recordToEntity.class;
      if (!fitnessTestName || !year || !class_) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = {};
      }
      if (!acc[fitnessTestName][year][class_]) {
        acc[fitnessTestName][year][class_] = [];
      }
      acc[fitnessTestName][year][class_].push(record);
      return acc;
    }, {} as Record<string, Record<string, Record<string, typeof schoolTestData_>>>);

    const FRONTEND_EXERCISE_TYPES = [
      "体重指数（BMI）",
      "肺活量",
      "50米跑",
      "坐位体前屈",
      "一分钟跳绳",
      "一分钟仰卧起坐",
      "50米×8往返跑",
    ];

    const totalPeopleThisTest = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || scoresGrades[year]?.[class_]?.[5] === undefined) return null;
      return parseInt(scoresGrades[year][class_][5]);
    })();

    const totalPeople = (() => {
      if (fitnessTestChosen.length === 0) return null;
      if (!year || !class_) return null;
      const r: Record<string, [number, number]> = {};
      for (const fitnessTest of fitnessTestChosen) {
        const allStudents = allYearsAndClasses[year].find(
          ([class2, total]) => class2 === class_
        )?.[1];
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTest
        )?.mainUploadYearsAndClassesScoresGrades;
        if (
          !scoresGrades ||
          scoresGrades[year]?.[class_]?.[5] === undefined ||
          allStudents === undefined
        )
          continue;
        const totalParticipating = parseInt(scoresGrades[year][class_][5]);
        r[fitnessTest] = [totalParticipating, allStudents - totalParticipating];
      }
      return r;
    })();
    const passingRate = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const year = yearClassChosen.slice(0, 3);
      const class_ = yearClassChosen.slice(3);
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || scoresGrades[year]?.[class_] === undefined) return null;
      return Number(scoresGrades[year][class_][2]) * 100;
    })();

    const dataSetCard2 = (() => {
      if (fitnessTestChosen.length === 0) return null;
      return fitnessTestChosen
        .map((test) => {
          const tt = testData.find((item) => item.name === test)!;
          const scoresGrades = testData.find(
            (item) => item.name === test
          )?.mainUploadYearsAndClassesScoresGrades;
          if (!tt || !scoresGrades || scoresGrades[year]?.[class_] === undefined) return null;
          const participatedStudents = parseInt(scoresGrades[year][class_][5]);
          const passingRate = parseFloat(scoresGrades[year][class_][2]);
          return {
            label: test,
            date: new Date(tt.fitnessTestDate ?? new Date()),
            data: [
              Math.round(passingRate * participatedStudents),
              participatedStudents - Math.round(passingRate * participatedStudents),
            ] as [number, number],
          };
        })
        .filter((item) => item !== null);
    })();

    const card3 = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || !scoresGrades[year]?.[class_]) return null;
      return scoresGrades[year][class_];
    })();

    const card4 = (() => {
      if (fitnessTestChosen.length === 0) return [];
      return FRONTEND_EXERCISE_TYPES.map((type) => {
        const totalRes: {
          d: { classScore: string; grade: string | null; classPassRate: string } | null;
          res: { label: string; date: Date; data: number[] }[];
          type: string;
          people: Record<string, number>;
        } = {
          d: null,
          res: [],
          type,
          people: {},
        };
        const people: Record<string, number> = {};
        for (const test of fitnessTestChosen) {
          const scoresGrades = testData.find(
            (item) => item.name === test
          )?.mainUploadYearsAndClassesScoresGrades;
          if (!scoresGrades || scoresGrades[year]?.[class_]?.[5] === undefined) continue;
          people[test] = parseInt(scoresGrades[year][class_][5]);
        }
        totalRes.people = people;
        let sum = 0;
        let passing = 0;
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTestChosen[0]
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!scoresGrades || scoresGrades[year]?.[class_]?.[5] === undefined) return totalRes;
        const participatedStudents = parseInt(scoresGrades[year][class_][5]);
        for (const record of data[fitnessTestChosen[0]][year][class_]) {
          if (record.recordType === type && record.normalizedScore !== null) {
            sum += record.normalizedScore;
            sum += record.additionalScore ?? 0;
            if (type === "体重指数（BMI）") {
              if (record.grade !== "肥胖") {
                passing++;
              }
            } else {
              if (record.grade !== "不及格") {
                passing++;
              }
            }
          }
        }
        const d = {
          classScore: (sum / participatedStudents).toFixed(1),
          grade: findGrade(sum / participatedStudents),
          classPassRate: ((passing / participatedStudents) * 100).toFixed(1),
        };

        const res: { label: string; date: Date; data: number[] }[] = [];
        for (const test of fitnessTestChosen) {
          let gradeExcellent = 0;
          let gradeGood = 0;
          let gradeAverage = 0;
          let gradeFailed = 0;
          if (!data[test]?.[year]?.[class_]) continue;
          for (const record of data[test][year][class_]) {
            if (record.recordType === type && record.grade !== null) {
              if (type === "体重指数（BMI）") {
                gradeExcellent += record.grade === "正常" ? 1 : 0;
                gradeGood += record.grade === "低体重" ? 1 : 0;
                gradeAverage += record.grade === "超重" ? 1 : 0;
                gradeFailed += record.grade === "肥胖" ? 1 : 0;
              } else {
                gradeExcellent += record.grade === "优秀" ? 1 : 0;
                gradeGood += record.grade === "良好" ? 1 : 0;
                gradeAverage += record.grade === "及格" ? 1 : 0;
                gradeFailed += record.grade === "不及格" ? 1 : 0;
              }
            }
          }
          if (type === "体重指数（BMI）") {
            res.push({
              label: test,
              date: new Date(
                testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
              ),
              data: [gradeGood, gradeExcellent, gradeAverage, gradeFailed],
            });
          } else {
            res.push({
              label: test,
              date: new Date(
                testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
              ),
              data: [gradeFailed, gradeAverage, gradeGood, gradeExcellent],
            });
          }
        }
        totalRes.d = d;
        totalRes.res = res;
        return totalRes;
      });
    })();

    return c.json({
      data: {
        totalPeopleThisTest,
        totalPeople,
        passingRate,
        dataSetCard2,
        card3,
        card4,
      },
    });
  })
  .get("/schoolTest/year", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));
    const { canSeeWholeYear } = getPermission(session);
    if (!canSeeWholeYear) {
      throw new Error("Unauthorized");
    }
    const queryableYearsAndClasses = await getQueryableYearsAndClasses(session, entityType);
    const fitnessTestChosen = c.req.queries("testName") || [];
    const yearChosen = c.req.query("year") || null;
    if (!yearChosen) {
      throw new Error("Year not found");
    }
    if (!queryableYearsAndClasses[yearChosen]) {
      throw new Error("Unauthorized");
    }
    const testData = await db
      .select()
      .from(fitnessTest)
      .where(inArray(fitnessTest.name, fitnessTestChosen));
    const allYearsAndClasses = await getAllYearsAndClasses(session.allClassifications[0].schoolId);
    if (testData.length !== fitnessTestChosen.length) {
      throw new Error("Fitness test not found");
    }
    const schoolTestData_ = await getSchoolTestData(({ fitnessTest }) => {
      return [inArray(fitnessTest.name, fitnessTestChosen)];
    });
    const data = schoolTestData_.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      if (!fitnessTestName || !year) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = [];
      }
      acc[fitnessTestName][year].push(record);
      return acc;
    }, {} as Record<string, Record<string, typeof schoolTestData_>>);

    const classData = schoolTestData_.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      const class_ = record.recordToEntity.class;
      if (!fitnessTestName || !year || !class_) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = {};
      }
      if (!acc[fitnessTestName][year][class_]) {
        acc[fitnessTestName][year][class_] = [];
      }
      acc[fitnessTestName][year][class_].push(record);
      return acc;
    }, {} as Record<string, Record<string, Record<string, typeof schoolTestData_>>>);

    const FRONTEND_EXERCISE_TYPES = [
      "体重指数（BMI）",
      "肺活量",
      "50米跑",
      "坐位体前屈",
      "一分钟跳绳",
      "一分钟仰卧起坐",
      "50米×8往返跑",
    ];

    const totalPeopleThisTest = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || scoresGrades[yearChosen] === undefined) return null;
      let sum = 0;
      for (const class_ in scoresGrades[yearChosen]) {
        sum += parseInt(scoresGrades[yearChosen][class_][5]);
      }
      return sum;
    })();

    const totalPeople = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const r: Record<string, [number, number]> = {};
      for (const fitnessTest of fitnessTestChosen) {
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTestChosen[0]
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!scoresGrades || scoresGrades[yearChosen] === undefined) return null;
        let sum = 0;
        for (const class_ in scoresGrades[yearChosen]) {
          sum += parseInt(scoresGrades[yearChosen][class_][5]);
        }
        const allStudents = allYearsAndClasses[yearChosen].reduce((acc, curr) => acc + curr[1], 0);
        r[fitnessTest] = [sum, allStudents - sum];
      }
      return r;
    })();

    const passingRate = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const year = yearChosen;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || !scoresGrades[year]) return null;
      let totalParticipating = 0;
      let totalPassing = 0;
      for (const class_ in scoresGrades[year]) {
        totalParticipating += parseInt(scoresGrades[year][class_][5]);
        totalPassing +=
          parseFloat(scoresGrades[year][class_][2]) * parseInt(scoresGrades[year][class_][5]);
      }
      return ((totalPassing / totalParticipating) * 100).toFixed(1);
    })();

    const dataSetCard2 = (() => {
      if (fitnessTestChosen.length === 0) return null;
      return fitnessTestChosen
        .map((test) => {
          const tt = testData.find((item) => item.name === test)!;
          const scoresGrades = testData.find(
            (item) => item.name === test
          )?.mainUploadYearsAndClassesScoresGrades;
          if (!tt || !scoresGrades || scoresGrades[yearChosen] === undefined) return null;
          let passing = 0;
          let failing = 0;
          for (const class_ in scoresGrades[yearChosen]) {
            passing += Math.round(
              parseFloat(scoresGrades[yearChosen][class_][2]) *
                parseInt(scoresGrades[yearChosen][class_][5])
            );
            failing += Math.round(
              (1 - parseFloat(scoresGrades[yearChosen][class_][2])) *
                parseInt(scoresGrades[yearChosen][class_][5])
            );
          }
          return {
            label: test,
            date: new Date(tt.fitnessTestDate ?? new Date()),
            data: [passing, failing] as [number, number],
          };
        })
        .filter((item) => item !== null);
    })();

    const dataSetCard3 = (() => {
      if (fitnessTestChosen.length === 0) return null;
      let sumAvgNorm = 0;
      let sumNorm = 0;
      let sumParticipating = 0;
      let sumAdditional = 0;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades || !scoresGrades[yearChosen]) return null;
      for (const class_ in scoresGrades[yearChosen]) {
        const total = parseInt(scoresGrades[yearChosen][class_][5]);
        sumAvgNorm += parseFloat(scoresGrades[yearChosen][class_][0]) * total;
        sumNorm += parseFloat(scoresGrades[yearChosen][class_][3]) * total;
        sumParticipating += total;
        sumAdditional += parseFloat(scoresGrades[yearChosen][class_][4]) * total;
      }
      return [
        (sumAvgNorm / sumParticipating).toFixed(1),
        findGrade(sumAvgNorm / sumParticipating),
        -1,
        (sumNorm / sumParticipating).toFixed(1),
        (sumAdditional / sumParticipating).toFixed(1),
      ];
    })();

    const card4 = (() => {
      return FRONTEND_EXERCISE_TYPES.map((type) => {
        const totalRes: {
          classes: string[];
          d: {
            classScore: string;
            grade: string;
            classPassRate: string;
            bestStudent: {
              score: number;
              grade: string;
              student: string;
            };
          };
          dataSet: { label: string; date: Date; data: number[]; grade: string }[];
          totalStudents: Record<string, Record<string, number>>;
          dataSet2: { label: string; date: Date; data: number[] }[];
          type: string;
        } = {
          classes: [],
          d: {
            classScore: "--",
            grade: "--",
            classPassRate: "--",
            bestStudent: {
              score: 0,
              grade: "--",
              student: "--",
            },
          },
          dataSet: [],
          totalStudents: {},
          dataSet2: [],
          type,
        };

        const allClasses = new Set<string>();
        for (const test of fitnessTestChosen) {
          if (!classData[test]?.[yearChosen]) continue;
          const t = Object.keys(classData[test][yearChosen]);
          for (const class_ of t) {
            allClasses.add(class_);
          }
        }
        totalRes.classes = Array.from(allClasses).toSorted((a, b) => {
          const numA = parseInt(a.split("班")[0]);
          const numB = parseInt(b.split("班")[0]);
          return numA - numB;
        });

        let sum = 0;
        let passing = 0;
        let totalPeople = 0;
        let bestStudent = {
          score: 0,
          grade: "--",
          student: "--",
        };
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTestChosen[0]
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!scoresGrades || scoresGrades[yearChosen] === undefined) return totalRes;
        for (const class_ in scoresGrades[yearChosen]) {
          totalPeople += parseInt(scoresGrades[yearChosen][class_][5]);
        }
        for (const record of data[fitnessTestChosen[0]][yearChosen]) {
          if (record.recordType === type && record.normalizedScore !== null) {
            sum += record.normalizedScore;
            if (type === "体重指数（BMI）") {
              if (record.grade !== "肥胖") {
                passing++;
              }
            } else {
              if (record.grade !== "不及格") {
                passing++;
              }
            }
            if (record.normalizedScore > bestStudent.score) {
              bestStudent = {
                score: record.normalizedScore,
                grade: record.grade ?? "--",
                student: record.recordToEntity.name,
              };
            }
          }
        }
        totalRes.d = {
          classScore: (sum / totalPeople).toFixed(1),
          grade: findGrade(sum / totalPeople) ?? "--",
          classPassRate: ((passing / totalPeople) * 100).toFixed(1),
          bestStudent: bestStudent,
        };

        for (const test of fitnessTestChosen) {
          if (!totalRes.totalStudents[test]) totalRes.totalStudents[test] = {};
          let gradeExcellent: Record<string, number> = {};
          let gradeGood: Record<string, number> = {};
          let gradeAverage: Record<string, number> = {};
          let gradeFailed: Record<string, number> = {};
          if (!data[test]?.[yearChosen]) continue;
          for (const record of data[test][yearChosen]) {
            if (!record.recordToEntity.class) continue;
            if (!totalRes.totalStudents[test][record.recordToEntity.class]) {
              totalRes.totalStudents[test][record.recordToEntity.class] = 0;
            }
            if (!gradeExcellent.hasOwnProperty(record.recordToEntity.class)) {
              gradeExcellent[record.recordToEntity.class] = 0;
            }
            if (!gradeGood.hasOwnProperty(record.recordToEntity.class)) {
              gradeGood[record.recordToEntity.class] = 0;
            }
            if (!gradeAverage.hasOwnProperty(record.recordToEntity.class)) {
              gradeAverage[record.recordToEntity.class] = 0;
            }
            if (!gradeFailed.hasOwnProperty(record.recordToEntity.class)) {
              gradeFailed[record.recordToEntity.class] = 0;
            }

            if (record.recordType === type && record.grade !== null) {
              totalRes.totalStudents[test][record.recordToEntity.class] += 1;
              if (type === "体重指数（BMI）") {
                gradeExcellent[record.recordToEntity.class] += record.grade === "正常" ? 1 : 0;
                gradeGood[record.recordToEntity.class] += record.grade === "低体重" ? 1 : 0;
                gradeAverage[record.recordToEntity.class] += record.grade === "超重" ? 1 : 0;
                gradeFailed[record.recordToEntity.class] += record.grade === "肥胖" ? 1 : 0;
              } else {
                gradeExcellent[record.recordToEntity.class] += record.grade === "优秀" ? 1 : 0;
                gradeGood[record.recordToEntity.class] += record.grade === "良好" ? 1 : 0;
                gradeAverage[record.recordToEntity.class] += record.grade === "及格" ? 1 : 0;
                gradeFailed[record.recordToEntity.class] += record.grade === "不及格" ? 1 : 0;
              }
            }
          }
          const da = new Date(
            testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
          );
          totalRes.dataSet.push({
            label: test,
            date: da,
            data: totalRes.classes.map((class_) => gradeExcellent[class_] ?? 0),
            grade: type === "体重指数（BMI）" ? "正常" : "优秀",
          });
          totalRes.dataSet.push({
            label: test,
            date: da,
            data: totalRes.classes.map((class_) => gradeGood[class_] ?? 0),
            grade: type === "体重指数（BMI）" ? "低体重" : "良好",
          });
          totalRes.dataSet.push({
            label: test,
            date: da,
            data: totalRes.classes.map((class_) => gradeAverage[class_] ?? 0),
            grade: type === "体重指数（BMI）" ? "超重" : "及格",
          });
          totalRes.dataSet.push({
            label: test,
            date: da,
            data: totalRes.classes.map((class_) => gradeFailed[class_] ?? 0),
            grade: type === "体重指数（BMI）" ? "肥胖" : "不及格",
          });
        }

        for (const test of fitnessTestChosen) {
          let scores: Record<string, [number, number]> = {};
          if (!data[test]?.[yearChosen]) continue;
          for (const record of data[test][yearChosen]) {
            if (!record.recordToEntity.class) continue;
            if (!scores[record.recordToEntity.class]) {
              scores[record.recordToEntity.class] = [0, 0];
            }
            if (record.recordType === type && record.normalizedScore !== null) {
              scores[record.recordToEntity.class][0] += record.normalizedScore;
              scores[record.recordToEntity.class][1] += 1;
            }
          }

          const da = new Date(
            testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
          );
          totalRes.dataSet2.push({
            label: test,
            date: da,
            data: totalRes.classes.map((class_) =>
              scores[class_] ? Number((scores[class_]?.[0] / scores[class_]?.[1]).toFixed(1)) : 0
            ),
          });
        }
        return totalRes;
      });
    })();

    return c.json({
      totalPeopleThisTest,
      totalPeople,
      passingRate,
      dataSetCard2,
      dataSetCard3,
      card4,
    });
  })
  .get("/schoolTest/school", async (c) => {
    const [session, entityType] = checkValidSession(c.get("session"));
    const { canSeeWholeSchool } = getPermission(session);
    if (!canSeeWholeSchool) {
      throw new Error("Unauthorized");
    }
    const fitnessTestChosen = c.req.queries("testName") || [];
    const FRONTEND_EXERCISE_TYPES = [
      "体重指数（BMI）",
      "肺活量",
      "50米跑",
      "坐位体前屈",
      "一分钟跳绳",
      "一分钟仰卧起坐",
      "50米×8往返跑",
    ];
    const testData = await db
      .select()
      .from(fitnessTest)
      .where(inArray(fitnessTest.name, fitnessTestChosen));
    const allYearsAndClasses = await getAllYearsAndClasses(session.allClassifications[0].schoolId);
    if (testData.length !== fitnessTestChosen.length) {
      throw new Error("Fitness test not found");
    }
    const schoolTestData_ = await getSchoolTestData(({ fitnessTest }) => {
      return [inArray(fitnessTest.name, fitnessTestChosen)];
    });
    const data = schoolTestData_.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      if (!fitnessTestName) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = [];
      }
      acc[fitnessTestName].push(record);
      return acc;
    }, {} as Record<string, typeof schoolTestData_>);
    const yearData = schoolTestData_.reduce((acc, record) => {
      const fitnessTestName = record.fitnessTestName;
      const year = record.recordToEntity.year;
      if (!fitnessTestName || !year) return acc;
      if (!acc[fitnessTestName]) {
        acc[fitnessTestName] = {};
      }
      if (!acc[fitnessTestName][year]) {
        acc[fitnessTestName][year] = [];
      }
      acc[fitnessTestName][year].push(record);
      return acc;
    }, {} as Record<string, Record<string, typeof schoolTestData_>>);

    const totalPeopleThisTest = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades) return null;
      let sum = 0;
      for (const year in scoresGrades) {
        for (const class_ in scoresGrades[year]) {
          sum += parseInt(scoresGrades[year][class_][5]);
        }
      }
      return sum;
    })();

    const totalPeople = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const r: Record<string, [number, number]> = {};
      for (const fitnessTest of fitnessTestChosen) {
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTestChosen[0]
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!scoresGrades) return null;
        let sum = 0,
          totalStudents = 0;
        for (const year in scoresGrades) {
          for (const class_ in scoresGrades[year]) {
            sum += parseInt(scoresGrades[year][class_][5]);
          }
        }
        for (const year in allYearsAndClasses) {
          totalStudents += allYearsAndClasses[year].reduce((acc, curr) => acc + curr[1], 0);
        }
        r[fitnessTest] = [sum, totalStudents - sum];
      }
      return r;
    })();

    const passingRate = (() => {
      if (fitnessTestChosen.length === 0) return null;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades) return null;
      let totalParticipating = 0;
      let totalPassing = 0;
      for (const year in scoresGrades) {
        for (const class_ in scoresGrades[year]) {
          totalParticipating += parseInt(scoresGrades[year][class_][5]);
          totalPassing +=
            parseFloat(scoresGrades[year][class_][2]) * parseInt(scoresGrades[year][class_][5]);
        }
      }
      return ((totalPassing / totalParticipating) * 100).toFixed(1);
    })();

    const card2DataSet = (() => {
      if (fitnessTestChosen.length === 0) return null;
      return fitnessTestChosen
        .map((test) => {
          const tt = testData.find((item) => item.name === test)!;
          const scoresGrades = testData.find(
            (item) => item.name === test
          )?.mainUploadYearsAndClassesScoresGrades;
          if (!tt || !scoresGrades) return null;
          let passing = 0;
          let failing = 0;
          for (const year in scoresGrades) {
            for (const class_ in scoresGrades[year]) {
              passing += Math.round(
                parseFloat(scoresGrades[year][class_][2]) * parseInt(scoresGrades[year][class_][5])
              );
              failing += Math.round(
                (1 - parseFloat(scoresGrades[year][class_][2])) *
                  parseInt(scoresGrades[year][class_][5])
              );
            }
          }
          return {
            label: test,
            date: new Date(tt.fitnessTestDate ?? new Date()),
            data: [passing, failing] as [number, number],
          };
        })
        .filter((item) => item !== null);
    })();

    const years = (() => {
      if (!yearData || fitnessTestChosen.length === 0) return [];
      const allYears = new Set<string>();
      for (const test of fitnessTestChosen) {
        if (!yearData[test]) continue;
        const t = Object.keys(yearData[test]);
        for (const year of t) {
          allYears.add(year);
        }
      }
      return Array.from(allYears).toSorted((a, b) => getYearOrder(a[0]) - getYearOrder(b[0]));
    })();

    const card31DataSet = (() => {
      if (fitnessTestChosen.length === 0 || years.length === 0) return [];
      const r: { label: string; date: Date; data: number[] }[] = [];
      for (const test of fitnessTestChosen) {
        if (!data[test]) continue;
        let totalParticipation: Record<string, Set<string>> = {};
        let total: Record<string, Set<string>> = {};
        for (const record of data[test]) {
          if (!record.recordToEntity.year) continue;
          if (!total[record.recordToEntity.year]) {
            total[record.recordToEntity.year] = new Set();
            totalParticipation[record.recordToEntity.year] = new Set();
          }
          total[record.recordToEntity.year].add(record.recordToEntity.entityId);
          if (record.normalizedScore !== null) {
            totalParticipation[record.recordToEntity.year].add(record.recordToEntity.entityId);
          }
        }
        const da = new Date(
          testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
        );
        r.push({
          label: test,
          date: da,
          data: years
            .map((year) =>
              total[year] !== undefined
                ? Number(((totalParticipation[year].size / total[year].size) * 100).toFixed(1))
                : null
            )
            .filter((m) => m !== null),
        });
      }
      return r;
    })();

    const card32DataSet = (() => {
      if (fitnessTestChosen.length === 0 || years.length === 0) return [];
      const r: { label: string; date: Date; data: number[] }[] = [];
      for (const test of fitnessTestChosen) {
        if (!data[test]) continue;
        let totalPassing: Record<string, number> = {};
        let total: Record<string, number> = {};
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTestChosen[0]
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!scoresGrades) return null;
        for (const year in scoresGrades) {
          for (const class_ in scoresGrades[year]) {
            total[year] = parseInt(scoresGrades[year][class_][5]);
            totalPassing[year] = Math.round(
              parseInt(scoresGrades[year][class_][5]) * parseFloat(scoresGrades[year][class_][2])
            );
          }
        }
        const da = new Date(
          testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
        );
        r.push({
          label: test,
          date: da,
          data: years
            .map((year) =>
              total[year] !== undefined
                ? Number(((totalPassing[year] / total[year]) * 100).toFixed(1))
                : null
            )
            .filter((m) => m !== null),
        });
      }
      return r;
    })();

    const card3 = (() => {
      if (fitnessTestChosen.length === 0) return null;
      let sumAvgNorm = 0;
      let sumNorm = 0;
      let sumParticipating = 0;
      let sumAdditional = 0;
      const scoresGrades = testData.find(
        (item) => item.name === fitnessTestChosen[0]
      )?.mainUploadYearsAndClassesScoresGrades;
      if (!scoresGrades) return null;
      for (const year in scoresGrades) {
        for (const class_ in scoresGrades[year]) {
          const total = parseInt(scoresGrades[year][class_][5]);
          sumAvgNorm += parseFloat(scoresGrades[year][class_][0]) * total;
          sumNorm += parseFloat(scoresGrades[year][class_][3]) * total;
          sumParticipating += total;
          sumAdditional += parseFloat(scoresGrades[year][class_][4]) * total;
        }
      }
      return [
        (sumAvgNorm / sumParticipating).toFixed(1),
        findGrade(sumAvgNorm / sumParticipating),
        -1,
        (sumNorm / sumParticipating).toFixed(1),
        (sumAdditional / sumParticipating).toFixed(1),
      ];
    })();

    const card4 = (() => {
      return FRONTEND_EXERCISE_TYPES.map((type) => {
        const totalRes: {
          d: {
            classScore: string;
            grade: string | null;
            classPassRate: string;
            bestStudent: { score: number; grade: string; student: string };
          };
          res: { label: string; date: Date; data: number[]; grade: string }[];
          type: string;
          totalStudents: Record<string, Record<string, number>>;
          dataSet2: { label: string; date: Date; data: number[] }[];
        } = {
          d: {
            classScore: "--",
            grade: "--",
            classPassRate: "--",
            bestStudent: {
              score: 0,
              grade: "--",
              student: "--",
            },
          },
          res: [],
          type,
          totalStudents: {},
          dataSet2: [],
        };
        let sum = 0;
        let passing = 0;
        let totalPeople = 0;
        let bestStudent = {
          score: 0,
          grade: "--",
          student: "--",
        };
        const scoresGrades = testData.find(
          (item) => item.name === fitnessTestChosen[0]
        )?.mainUploadYearsAndClassesScoresGrades;
        if (!scoresGrades) return totalRes;
        for (const year in scoresGrades) {
          for (const class_ in scoresGrades[year]) {
            if (type === "50米×8往返跑") {
              if (year !== "五年级" && year !== "六年级") {
                continue;
              }
            }
            totalPeople += parseInt(scoresGrades[year][class_][5]);
          }
        }
        for (const record of data[fitnessTestChosen[0]]) {
          if (record.recordType === type && record.normalizedScore !== null) {
            sum += record.normalizedScore;
            if (type === "体重指数（BMI）") {
              if (record.grade !== "肥胖") {
                passing++;
              }
            } else {
              if (record.grade !== "不及格") {
                passing++;
              }
            }
            if (record.normalizedScore > bestStudent.score) {
              bestStudent = {
                score: record.normalizedScore,
                grade: record.grade ?? "--",
                student: record.recordToEntity.name,
              };
            }
          }
        }
        totalRes.d = {
          classScore: (sum / totalPeople).toFixed(1),
          grade: findGrade(sum / totalPeople),
          classPassRate: ((passing / totalPeople) * 100).toFixed(1),
          bestStudent: bestStudent,
        };
        for (const test of fitnessTestChosen) {
          if (!totalRes.totalStudents[test]) totalRes.totalStudents[test] = {};
          let gradeExcellent: Record<string, number> = {};
          let gradeGood: Record<string, number> = {};
          let gradeAverage: Record<string, number> = {};
          let gradeFailed: Record<string, number> = {};
          if (!data[test]) continue;
          for (const record of data[test]) {
            if (!record.recordToEntity.year) continue;
            if (!totalRes.totalStudents[test][record.recordToEntity.year]) {
              totalRes.totalStudents[test][record.recordToEntity.year] = 0;
            }
            if (!gradeExcellent.hasOwnProperty(record.recordToEntity.year)) {
              gradeExcellent[record.recordToEntity.year] = 0;
            }
            if (!gradeGood.hasOwnProperty(record.recordToEntity.year)) {
              gradeGood[record.recordToEntity.year] = 0;
            }
            if (!gradeAverage.hasOwnProperty(record.recordToEntity.year)) {
              gradeAverage[record.recordToEntity.year] = 0;
            }
            if (!gradeFailed.hasOwnProperty(record.recordToEntity.year)) {
              gradeFailed[record.recordToEntity.year] = 0;
            }

            if (record.recordType === type && record.grade !== null) {
              totalRes.totalStudents[test][record.recordToEntity.year] += 1;
              if (type === "体重指数（BMI）") {
                gradeExcellent[record.recordToEntity.year] += record.grade === "正常" ? 1 : 0;
                gradeGood[record.recordToEntity.year] += record.grade === "低体重" ? 1 : 0;
                gradeAverage[record.recordToEntity.year] += record.grade === "超重" ? 1 : 0;
                gradeFailed[record.recordToEntity.year] += record.grade === "肥胖" ? 1 : 0;
              } else {
                gradeExcellent[record.recordToEntity.year] += record.grade === "优秀" ? 1 : 0;
                gradeGood[record.recordToEntity.year] += record.grade === "良好" ? 1 : 0;
                gradeAverage[record.recordToEntity.year] += record.grade === "及格" ? 1 : 0;
                gradeFailed[record.recordToEntity.year] += record.grade === "不及格" ? 1 : 0;
              }
            }
          }
          const da = new Date(
            testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
          );
          totalRes.res.push({
            label: test,
            date: da,
            data: years.map((year) => gradeExcellent[year] ?? 0),
            grade: type === "体重指数（BMI）" ? "正常" : "优秀",
          });
          totalRes.res.push({
            label: test,
            date: da,
            data: years.map((year) => gradeGood[year] ?? 0),
            grade: type === "体重指数（BMI）" ? "低体重" : "良好",
          });
          totalRes.res.push({
            label: test,
            date: da,
            data: years.map((year) => gradeAverage[year] ?? 0),
            grade: type === "体重指数（BMI）" ? "超重" : "及格",
          });
          totalRes.res.push({
            label: test,
            date: da,
            data: years.map((year) => gradeFailed[year] ?? 0),
            grade: type === "体重指数（BMI）" ? "肥胖" : "不及格",
          });
        }

        for (const test of fitnessTestChosen) {
          let scores: Record<string, [number, number]> = {};
          if (!data[test]) continue;
          for (const record of data[test]) {
            if (!record.recordToEntity.year) continue;
            if (!scores[record.recordToEntity.year]) {
              scores[record.recordToEntity.year] = [0, 0];
            }
            if (record.recordType === type && record.normalizedScore !== null) {
              scores[record.recordToEntity.year][0] += record.normalizedScore;
              scores[record.recordToEntity.year][1] += 1;
            }
          }

          const da = new Date(
            testData.find((item) => item.id === test)?.fitnessTestDate ?? new Date()
          );
          totalRes.dataSet2.push({
            label: test,
            date: da,
            data: years.map((year) =>
              scores[year] ? Number((scores[year]?.[0] / scores[year]?.[1]).toFixed(1)) : 0
            ),
          });
        }

        return totalRes;
      });
    })();

    return c.json({
      totalPeopleThisTest,
      totalPeople,
      passingRate,
      card2DataSet,
      card31DataSet,
      card32DataSet,
      card3,
      card4,
      years,
    });
  })
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
