import additionalScoreData from "@/data/base/additional_score";
import gradingData from "@/data/base/grading";
import { db } from "@/db";
import { additionalScore, generalClassification, grading, measureType } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

const measureTypeMap = new Map<string, string>();
const generalClassificationMap = new Map<string, Map<string, string>>();

async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Cannot insert base data in non-development environment");
  }
  await db.execute(sql`TRUNCATE TABLE additional_score`);
  await db.execute(sql`TRUNCATE TABLE grading`);
  await db.transaction(async (tx) => {
    try {
      const gradingTasks: any[] = [];
      for (const item of gradingData) {
        if (!measureTypeMap.has(item.name)) {
          const measureTypeExisting = await tx
            .select()
            .from(measureType)
            .where(eq(measureType.name, item.name));
          if (measureTypeExisting.length === 0) {
            const measureTypeNew = await tx
              .insert(measureType)
              .values({
                name: item.name,
                unit: item.unit,
                isExercise: item.isExercise,
              })
              .returning();
            measureTypeMap.set(item.name, measureTypeNew[0].id);
          } else {
            measureTypeMap.set(item.name, measureTypeExisting[0].id);
          }
        }
        if (!generalClassificationMap.has(item.schoolType)) {
          const map = new Map<string, string>();
          const generalClassificationNullYearExisting = await tx
            .select()
            .from(generalClassification)
            .where(
              and(
                eq(generalClassification.schoolType, item.schoolType),
                isNull(generalClassification.year)
              )
            );
          if (generalClassificationNullYearExisting.length === 0) {
            const generalClassificationNullYearNew = await tx
              .insert(generalClassification)
              .values({
                schoolType: item.schoolType,
              })
              .returning();
            map.set("-1", generalClassificationNullYearNew[0].id);
          } else {
            map.set("-1", generalClassificationNullYearExisting[0].id);
          }
          generalClassificationMap.set(item.schoolType, map);
        }
        if (item.year && !generalClassificationMap.get(item.schoolType)!.has(item.year)) {
          const generalClassificationExisting = await tx
            .select()
            .from(generalClassification)
            .where(
              and(
                eq(generalClassification.schoolType, item.schoolType),
                eq(generalClassification.year, item.year)
              )
            );
          if (generalClassificationExisting.length === 0) {
            const generalClassificationNew = await tx
              .insert(generalClassification)
              .values({
                schoolType: item.schoolType,
                year: item.year,
              })
              .returning();
            generalClassificationMap
              .get(item.schoolType)!
              .set(item.year, generalClassificationNew[0].id);
          } else {
            generalClassificationMap
              .get(item.schoolType)!
              .set(item.year, generalClassificationExisting[0].id);
          }
        }

        const measureTypeId = measureTypeMap.get(item.name);
        const generalClassificationId = generalClassificationMap
          .get(item.schoolType)!
          .get(item.year ?? "-1");

        if (!measureTypeId || !generalClassificationId) {
          throw new Error("measureTypeId or generalClassificationId not found", {
            cause: { measureTypeId, generalClassificationId },
          });
        }

        console.log("Inserting grading data:", item);
        gradingTasks.push(
          tx.insert(grading).values({
            measureTypeId,
            generalClassificationId,
            gender: item.gender,
            scoreUpperRange: "scoreUpperRange" in item ? item.scoreUpperRange ?? null : null,
            scoreLowerRange: "scoreLowerRange" in item ? item.scoreLowerRange ?? null : null,
            score: "score" in item ? item.score ?? null : null,
            normalizedScore: item.normalizedScore,
            grade: item.grade,
          })
        );
      }
      await Promise.all(gradingTasks);
      console.log("Grading data inserted successfully");
    } catch (error) {
      console.error("Error inserting grading data:", error);
      tx.rollback();
      throw error;
    }
  });
  await db.transaction(async (tx) => {
    try {
      const additionalScoreTasks: any[] = [];
      for (const item of additionalScoreData) {
        if (!measureTypeMap.has(item.name)) {
          const measureTypeExisting = await tx
            .select()
            .from(measureType)
            .where(eq(measureType.name, item.name));
          if (measureTypeExisting.length === 0) {
            const measureTypeNew = await tx
              .insert(measureType)
              .values({
                name: item.name,
                unit: item.unit,
                isExercise: item.isExercise,
              })
              .returning();
            measureTypeMap.set(item.name, measureTypeNew[0].id);
          } else {
            measureTypeMap.set(item.name, measureTypeExisting[0].id);
          }
        }
        if (!generalClassificationMap.has(item.schoolType)) {
          const map = new Map<string, string>();
          const generalClassificationNullYearExisting = await tx
            .select()
            .from(generalClassification)
            .where(
              and(
                eq(generalClassification.schoolType, item.schoolType),
                isNull(generalClassification.year)
              )
            );
          if (generalClassificationNullYearExisting.length === 0) {
            const generalClassificationNullYearNew = await tx
              .insert(generalClassification)
              .values({
                schoolType: item.schoolType,
              })
              .returning();
            map.set("-1", generalClassificationNullYearNew[0].id);
          } else {
            map.set("-1", generalClassificationNullYearExisting[0].id);
          }
          generalClassificationMap.set(item.schoolType, map);
        }
        if (item.year && !generalClassificationMap.get(item.schoolType)!.has(item.year)) {
          const generalClassificationExisting = await tx
            .select()
            .from(generalClassification)
            .where(
              and(
                eq(generalClassification.schoolType, item.schoolType),
                eq(generalClassification.year, item.year)
              )
            );
          if (generalClassificationExisting.length === 0) {
            const generalClassificationNew = await tx
              .insert(generalClassification)
              .values({
                schoolType: item.schoolType,
                year: item.year,
              })
              .returning();
            generalClassificationMap
              .get(item.schoolType)!
              .set(item.year, generalClassificationNew[0].id);
          } else {
            generalClassificationMap
              .get(item.schoolType)!
              .set(item.year, generalClassificationExisting[0].id);
          }
        }

        const measureTypeId = measureTypeMap.get(item.name);
        const generalClassificationId = generalClassificationMap
          .get(item.schoolType)!
          .get(item.year ?? "-1");

        if (!measureTypeId || !generalClassificationId) {
          throw new Error("measureTypeId or generalClassificationId not found", {
            cause: { measureTypeId, generalClassificationId },
          });
        }

        console.log("Inserting additional score data:", item);
        additionalScoreTasks.push(
          tx.insert(additionalScore).values({
            measureTypeId,
            generalClassificationId,
            gender: item.gender,
            offset: item.offset,
            offsetCondition: item.offsetCondition,
            additionalScore: item.additionalScore,
          })
        );
      }
      await Promise.all(additionalScoreTasks);
      console.log("Additional score data inserted successfully");
    } catch (error) {
      console.error("Error inserting additional score data:", error);
      tx.rollback();
      throw error;
    }
  });
}

main();
