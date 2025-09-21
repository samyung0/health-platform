import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  measureType,
  record,
  recordNature,
} from "@/db/schema";
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
import { eq, gt, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 } from "uuid";

const router = createRouter();
router.basePath("/records");

router.on("GET", "*", withQueryableId);
router.on(["POST", "PUT", "DELETE"], "*", withModifyableId);

// RECORD routes
router.post("/", zValidator("form", createRecordValidator), async (c) => {
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
});

router.get("/", zValidator("query", getRecordsQueryValidator), async (c) => {
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

  // TODO: add in type as student for filtering

  let query = db
    .select({
      recordId: record.id,
      recordToEntity: {
        classificationId: toClassification.id,
        schoolName: toClassification.schoolName,
        schoolType: toClassification.schoolType,
        year: toClassificationMap.year,
        class: toClassificationMap.class,
        classNumber: toClassificationMap.classNumber,
        name: toEntity.name,
        isChildOf: toEntity.isChildOf,
        entityId: toEntity.id,
      },
      recordFromEntity: {
        classificationId: fromClassification.id,
        schoolName: fromClassification.schoolName,
        schoolType: fromClassification.schoolType,
        year: fromClassificationMap.year,
        class: fromClassificationMap.class,
        classNumber: fromClassificationMap.classNumber,
        name: fromEntity.name,
        isChildOf: fromEntity.isChildOf,
        entityId: fromEntity.id,
      },
      measure: {
        id: measureType.id,
        name: measureType.name,
        unit: measureType.unit,
        isExercise: measureType.isExercise,
      },
      recordNature: {
        id: recordNature.id,
        name: recordNature.name,
        inSchool: recordNature.inSchool,
      },
      score: record.score,
      videoUrl: record.videoUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
    .from(record)
    .innerJoin(toClassification, eq(record.toEntityClassification, toClassification.id))
    .innerJoin(fromClassification, eq(record.fromEntityClassification, fromClassification.id))
    .innerJoin(toEntity, eq(toClassification.entityId, toEntity.id))
    .innerJoin(fromEntity, eq(fromClassification.entityId, fromEntity.id))
    .innerJoin(measureType, eq(record.measureTypeId, measureType.id))
    .innerJoin(recordNature, eq(record.recordNatureId, recordNature.id))
    .innerJoin(toClassificationMap, eq(toClassification.id, toClassificationMap.classificationId))
    .innerJoin(
      fromClassificationMap,
      eq(fromClassification.id, fromClassificationMap.classificationId)
    )
    .$dynamic();

  if (queryParams.validFromYear) {
    query = query.where(
      gt(
        toClassification.validTo,
        new Date(parseInt(queryParams.validFromYear), DEFAULT_OUTDATED_MONTH, DEFAULT_OUTDATED_DAY)
      )
    );
  }

  if (queryParams.validToYear) {
    query = query.where(
      lte(
        toClassification.validTo,
        new Date(parseInt(queryParams.validToYear), DEFAULT_OUTDATED_MONTH, DEFAULT_OUTDATED_DAY)
      )
    );
  }

  let results = await query.prepare(v4()).execute();

  results = results.filter((result) => {
    return c
      .get("permissionManager")
      .queryableClassificationIds.includes(result.recordToEntity.classificationId);
  });

  return c.json({
    data: results,
  });
});

router.get("/:id", async (c) => {
  if (!c.get("session") || !c.get("permissionManager")) {
    throw new Error("Unauthorized");
  }

  const id = c.req.param("id");

  // TODO: add in type as student for filtering

  if (!id) {
    return c.json({ error: "Record ID is required" }, 400);
  }

  const recordData = await db.select().from(record).where(eq(record.id, id)).limit(1);

  if (recordData.length === 0) {
    return c.json({ error: "Record not found" }, 404);
  }

  if (
    !c
      .get("permissionManager")
      .queryableClassificationIds.includes(recordData[0].toEntityClassification)
  ) {
    throw new Error("Unauthorized");
  }

  return c.json({
    data: recordData[0],
  });
});
router.put("/:id", zValidator("form", updateRecordValidator), async (c) => {
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
});
router.delete("/:id", async (c) => {
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
