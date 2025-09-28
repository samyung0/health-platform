import { db } from "@/db";
import { classification, classificationMap, entity, record, school } from "@/db/schema";
import { DEFAULT_OUTDATED_DAY, DEFAULT_OUTDATED_MONTH } from "@/lib/const";
import { createRouter } from "@/lib/create-app";
import {
  createRecordValidator,
  getRecordsQueryValidator,
  updateRecordValidator,
} from "@/lib/validators";
import withModifyableId from "@/middlewares/with-modifyable-id";
import withQueryableId from "@/middlewares/with-queryable-id";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt, lte, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 } from "uuid";

// for ts rpc to infer types, do NOT break the chain and do NOT use middleware globally

const router = createRouter()
  .post("/", zValidator("form", createRecordValidator), async (c) => {
    if (!c.get("session") || !c.get("permissionManager")) {
      throw new Error("Unauthorized");
    }

    const body = c.req.valid("form");
    const row = {
      ...body,
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromEntityClassification: c.get("session")!.activeClassifications[0].classificationId,
    };

    // TODO: add in type as student for checking

    if (
      !c.get("permissionManager").queryableClassificationIds.includes(body.toEntityClassification)
    ) {
      throw new Error("Unauthorized");
    }

    const newRecord = await db.insert(record).values(row).returning();

    return c.json(
      {
        message: "Record created successfully",
        data: newRecord[0],
      },
      201
    );
  })
  .get("/all", zValidator("query", getRecordsQueryValidator), withQueryableId, async (c) => {
    if (!c.get("session") || !c.get("permissionManager")) {
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
        isRedoOrMissingUploadTargetFitnesstTestId: record.isRedoOrMissingUploadTargetFitnesstTestId,
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
  .get("/schoolTest", zValidator("query", getRecordsQueryValidator), withQueryableId, async (c) => {
    if (!c.get("session") || !c.get("permissionManager")) {
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
        isRedoOrMissingUploadTargetFitnesstTestId: record.isRedoOrMissingUploadTargetFitnesstTestId,
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

    whereClause.push(eq(record.inSchool, true));
    whereClause.push(eq(record.recordType, "test"));

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
  .get(
    "/schoolExercise",
    zValidator("query", getRecordsQueryValidator),
    withQueryableId,
    async (c) => {
      if (!c.get("session") || !c.get("permissionManager")) {
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
          isRedoOrMissingUploadTargetFitnesstTestId:
            record.isRedoOrMissingUploadTargetFitnesstTestId,
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
      whereClause.push(eq(record.recordType, "exercise"));

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
      if (!c.get("session") || !c.get("permissionManager")) {
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
          isRedoOrMissingUploadTargetFitnesstTestId:
            record.isRedoOrMissingUploadTargetFitnesstTestId,
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
      whereClause.push(eq(record.recordType, "exercise"));

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
  .put("/:id", zValidator("form", updateRecordValidator), withModifyableId, async (c) => {
    if (!c.get("session") || !c.get("permissionManager")) {
      throw new Error("Unauthorized");
    }

    const id = c.req.param("id");
    const body = c.req.valid("form");

    if (!id) {
      return c.json({ error: "Record ID is required" }, 400);
    }

    const existingRecord = await db.select().from(record).where(eq(record.id, id)).limit(1);

    if (existingRecord.length === 0) {
      return c.json({ error: "Record not found" }, 404);
    }

    if (
      !c
        .get("permissionManager")
        .queryableClassificationIds.includes(existingRecord[0].toEntityClassification)
    ) {
      throw new Error("Unauthorized");
    }

    const updatedRecord = await db.update(record).set(body).where(eq(record.id, id)).returning();

    return c.json({
      message: "Record updated successfully",
      data: updatedRecord[0],
    });
  })
  .delete("/:id", withModifyableId, async (c) => {
    if (!c.get("session") || !c.get("permissionManager")) {
      throw new Error("Unauthorized");
    }

    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Record ID is required" }, 400);
    }

    const existingRecord = await db.select().from(record).where(eq(record.id, id)).limit(1);

    if (existingRecord.length === 0) {
      return c.json({ error: "Record not found" }, 404);
    }

    if (
      !c
        .get("permissionManager")
        .queryableClassificationIds.includes(existingRecord[0].toEntityClassification)
    ) {
      throw new Error("Unauthorized");
    }

    await db.delete(record).where(eq(record.id, id));

    return c.json({
      message: "Record deleted successfully",
    });
  });

export default router;
