import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fitnessTest,
  record,
  school,
} from "@/db/schema";
import { and, eq, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 } from "uuid";

export default async (
  sqlQuery?: (data: {
    toSchool: ReturnType<typeof alias<typeof school, "toSchool">>;
    toClassification: ReturnType<typeof alias<typeof classification, "toClassification">>;
    toClassificationMap: ReturnType<typeof alias<typeof classificationMap, "toClassificationMap">>;
    toEntity: ReturnType<typeof alias<typeof entity, "toEntity">>;
    record: typeof record;
    fitnessTest: typeof fitnessTest;
  }) => SQL[]
) => {
  const toClassification = alias(classification, "toClassification");
  const toClassificationMap = alias(classificationMap, "toClassificationMap");
  const toEntity = alias(entity, "toEntity");
  const toSchool = alias(school, "toSchool");
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
    .innerJoin(toEntity, eq(toClassification.entityId, toEntity.id))
    .innerJoin(toClassificationMap, eq(toClassification.id, toClassificationMap.classificationId))
    .innerJoin(toSchool, eq(toClassification.schoolId, toSchool.id))
    .innerJoin(fitnessTest, eq(record.fitnessTestId, fitnessTest.id))
    .$dynamic();

  const whereClause: SQL[] = [];

  whereClause.push(eq(record.inSchool, true));
  whereClause.push(eq(record.nature, "test"));
  whereClause.push(eq(record.isRedoOrMissingUpload, false));

  if (sqlQuery) {
    whereClause.push(
      ...sqlQuery({
        toSchool,
        toClassification,
        toClassificationMap,
        toEntity,
        record,
        fitnessTest,
      })
    );
  }

  query = query.where(and(...whereClause));

  let results = await query.prepare(v4()).execute();

  return results;
};
