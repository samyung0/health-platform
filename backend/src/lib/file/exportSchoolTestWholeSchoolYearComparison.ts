import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fitnessTest,
  record,
  school,
} from "@/db/schema";
import { findGrade, getWeightedSum, getYearOrder } from "@/lib/util";
import { and, eq, SQL } from "drizzle-orm";
import XLSX from "xlsx-js-style";

export default async function exportSchoolTestWholeSchoolYearComparison(
  schoolTestId: string,
  schoolId: string,
  isGenerateRedoOrMissing: "主测" | "补测" | "全部"
): Promise<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();

  const conditions: SQL[] = [eq(record.fitnessTestId, schoolTestId)];
  if (isGenerateRedoOrMissing !== "全部") {
    conditions.push(eq(record.isRedoOrMissingUpload, isGenerateRedoOrMissing === "补测"));
  }
  const [school_] = await db.select().from(school).where(eq(school.id, schoolId));
  const [fitnessTest_] = await db
    .select()
    .from(fitnessTest)
    .where(eq(fitnessTest.id, schoolTestId));
  if (!school_ || !fitnessTest_) {
    throw new Error("School or fitness test not found");
  }
  const records_ = await db
    .select({
      internalId: entity.internalId,
      score: record.score,
      normalizedScore: record.normalizedScore,
      additionalScore: record.additionalScore,
      recordType: record.recordType,
      class: classificationMap.class,
      year: classificationMap.year,
    })
    .from(record)
    .where(and(...conditions))
    .innerJoin(classification, eq(record.toEntityClassification, classification.id))
    .innerJoin(entity, eq(classification.entityId, entity.id))
    .innerJoin(classificationMap, eq(classification.id, classificationMap.classificationId));
  const calculatedFinalScorePerStudent_: Record<
    string,
    {
      scores: Record<
        string,
        {
          score: number | null;
          normalizedScore: number | null;
          additionalScore: number | null;
        }
      >;
      finalScore: number;
      finalAdditionalScore: number;
      finalTotalScore: string;
      finalGrade: string;
      year: string;
      class: string;
      internalId: string;
      hasNonNullScore: boolean;
    }
  > = {};

  for (const record_ of records_) {
    if (!calculatedFinalScorePerStudent_[record_.internalId]) {
      calculatedFinalScorePerStudent_[record_.internalId] = {
        scores: {
          [record_.recordType]: {
            score: record_.score,
            normalizedScore: record_.normalizedScore,
            additionalScore: record_.additionalScore,
          },
        },
        finalScore: getWeightedSum(
          record_.normalizedScore ?? 0,
          record_.recordType,
          school_.schoolType,
          record_.year ?? "六年级"
        ),
        finalAdditionalScore:
          record_.recordType === "身高" || record_.recordType === "体重"
            ? 0
            : record_.additionalScore ?? 0,
        finalTotalScore: "0",
        year: record_.year!,
        finalGrade: "",
        class: record_.class!,
        internalId: record_.internalId,
        hasNonNullScore: record_.score !== null,
      };
    } else {
      if (
        !calculatedFinalScorePerStudent_[record_.internalId].scores.hasOwnProperty(
          record_.recordType
        )
      ) {
        if (record_.recordType !== "身高" && record_.recordType !== "体重") {
          calculatedFinalScorePerStudent_[record_.internalId].finalScore += getWeightedSum(
            record_.normalizedScore ?? 0,
            record_.recordType,
            school_.schoolType,
            record_.year ?? "六年级"
          );
          calculatedFinalScorePerStudent_[record_.internalId].finalAdditionalScore +=
            record_.additionalScore ?? 0;
        }
        if (record_.score !== null) {
          calculatedFinalScorePerStudent_[record_.internalId].hasNonNullScore = true;
        }
        calculatedFinalScorePerStudent_[record_.internalId].scores[record_.recordType] = {
          score: record_.score,
          normalizedScore: record_.normalizedScore,
          additionalScore: record_.additionalScore,
        };
      } else if (
        record_.normalizedScore &&
        record_.normalizedScore >
          (calculatedFinalScorePerStudent_[record_.internalId].scores[record_.recordType]!
            .normalizedScore ?? 0)
      ) {
        calculatedFinalScorePerStudent_[record_.internalId].finalScore =
          calculatedFinalScorePerStudent_[record_.internalId].finalScore -
          getWeightedSum(
            calculatedFinalScorePerStudent_[record_.internalId].scores[record_.recordType]!
              .normalizedScore ?? 0,
            record_.recordType,
            school_.schoolType,
            record_.year ?? "六年级"
          ) +
          getWeightedSum(
            record_.normalizedScore ?? 0,
            record_.recordType,
            school_.schoolType,
            record_.year ?? "六年级"
          );
        calculatedFinalScorePerStudent_[record_.internalId].finalAdditionalScore =
          calculatedFinalScorePerStudent_[record_.internalId].finalAdditionalScore -
          (calculatedFinalScorePerStudent_[record_.internalId].scores[record_.recordType]!
            .additionalScore ?? 0) +
          (record_.additionalScore ?? 0);
        calculatedFinalScorePerStudent_[record_.internalId].scores[record_.recordType] = {
          score: record_.score,
          normalizedScore: record_.normalizedScore,
          additionalScore: record_.additionalScore,
        };
        if (record_.score !== null) {
          calculatedFinalScorePerStudent_[record_.internalId].hasNonNullScore = true;
        }
      }
    }
  }

  const distribution: Record<
    string,
    Record<
      string,
      {
        participation: number;
        notParticipation: number;
        goodOrExcellent: number;
        passing: number;
        totalNormalizedScore: number;

        goodOrExcellentRate: number;
        passingRate: number;
        normalizedScoreRate: number;
        totalRank: number;
      }
    >
  > = {};

  for (const internalId in calculatedFinalScorePerStudent_) {
    if (!calculatedFinalScorePerStudent_[internalId].hasNonNullScore) {
      if (!distribution[calculatedFinalScorePerStudent_[internalId].year]) {
        distribution[calculatedFinalScorePerStudent_[internalId].year] = {
          [calculatedFinalScorePerStudent_[internalId].class]: {
            participation: 0,
            notParticipation: 1,
            goodOrExcellent: 0,
            passing: 0,
            totalNormalizedScore: 0,
            goodOrExcellentRate: 0,
            passingRate: 0,
            normalizedScoreRate: 0,
            totalRank: 0,
          },
        };
      } else {
        if (
          !distribution[calculatedFinalScorePerStudent_[internalId].year][
            calculatedFinalScorePerStudent_[internalId].class
          ]
        ) {
          distribution[calculatedFinalScorePerStudent_[internalId].year][
            calculatedFinalScorePerStudent_[internalId].class
          ] = {
            participation: 0,
            notParticipation: 1,
            goodOrExcellent: 0,
            passing: 0,
            totalNormalizedScore: 0,
            goodOrExcellentRate: 0,
            passingRate: 0,
            normalizedScoreRate: 0,
            totalRank: 0,
          };
        } else {
          distribution[calculatedFinalScorePerStudent_[internalId].year][
            calculatedFinalScorePerStudent_[internalId].class
          ].notParticipation++;
        }
      }
      continue;
    }
    const f =
      calculatedFinalScorePerStudent_[internalId].finalScore +
      calculatedFinalScorePerStudent_[internalId].finalAdditionalScore;
    calculatedFinalScorePerStudent_[internalId].finalTotalScore = f.toFixed(1);
    calculatedFinalScorePerStudent_[internalId].finalGrade = findGrade(f)!;

    if (!distribution[calculatedFinalScorePerStudent_[internalId].year]) {
      distribution[calculatedFinalScorePerStudent_[internalId].year] = {
        [calculatedFinalScorePerStudent_[internalId].class]: {
          participation: 1,
          notParticipation: 0,
          goodOrExcellent:
            calculatedFinalScorePerStudent_[internalId].finalGrade === "优秀" ||
            calculatedFinalScorePerStudent_[internalId].finalGrade === "良好"
              ? 1
              : 0,
          passing: calculatedFinalScorePerStudent_[internalId].finalGrade !== "不及格" ? 1 : 0,
          totalNormalizedScore: f,
          goodOrExcellentRate: 0,
          passingRate: 0,
          normalizedScoreRate: 0,
          totalRank: 0,
        },
      };
      continue;
    }
    if (
      !distribution[calculatedFinalScorePerStudent_[internalId].year][
        calculatedFinalScorePerStudent_[internalId].class
      ]
    ) {
      distribution[calculatedFinalScorePerStudent_[internalId].year][
        calculatedFinalScorePerStudent_[internalId].class
      ] = {
        participation: 1,
        notParticipation: 0,
        goodOrExcellent:
          calculatedFinalScorePerStudent_[internalId].finalGrade === "优秀" ||
          calculatedFinalScorePerStudent_[internalId].finalGrade === "良好"
            ? 1
            : 0,
        passing: calculatedFinalScorePerStudent_[internalId].finalGrade !== "不及格" ? 1 : 0,
        totalNormalizedScore: f,
        goodOrExcellentRate: 0,
        passingRate: 0,
        normalizedScoreRate: 0,
        totalRank: 0,
      };
      continue;
    }

    distribution[calculatedFinalScorePerStudent_[internalId].year][
      calculatedFinalScorePerStudent_[internalId].class
    ].participation++;
    distribution[calculatedFinalScorePerStudent_[internalId].year][
      calculatedFinalScorePerStudent_[internalId].class
    ].goodOrExcellent +=
      calculatedFinalScorePerStudent_[internalId].finalGrade === "优秀" ||
      calculatedFinalScorePerStudent_[internalId].finalGrade === "良好"
        ? 1
        : 0;
    distribution[calculatedFinalScorePerStudent_[internalId].year][
      calculatedFinalScorePerStudent_[internalId].class
    ].passing += calculatedFinalScorePerStudent_[internalId].finalGrade !== "不及格" ? 1 : 0;
    distribution[calculatedFinalScorePerStudent_[internalId].year][
      calculatedFinalScorePerStudent_[internalId].class
    ].totalNormalizedScore += f;
  }

  for (const year in distribution) {
    for (const class_ in distribution[year]) {
      distribution[year][class_].goodOrExcellentRate =
        distribution[year][class_].goodOrExcellent / distribution[year][class_].participation;
      distribution[year][class_].passingRate =
        distribution[year][class_].passing / distribution[year][class_].participation;
      distribution[year][class_].normalizedScoreRate =
        distribution[year][class_].totalNormalizedScore / distribution[year][class_].participation;
    }
  }

  const ranks: Record<
    string,
    {
      goodOrExcellentRateRank: { n: number; class: string }[];
      passingRateRank: { n: number; class: string }[];
      normalizedScoreRank: { n: number; class: string }[];
      totalRank: { n: number; class: string }[];
    }
  > = {};
  for (const year in distribution) {
    ranks[year] = {
      goodOrExcellentRateRank: Object.entries(distribution[year]).map(([class_, class_data]) => ({
        n: class_data.goodOrExcellentRate,
        class: class_,
      })),
      passingRateRank: Object.entries(distribution[year]).map(([class_, class_data]) => ({
        n: class_data.passingRate,
        class: class_,
      })),
      normalizedScoreRank: Object.entries(distribution[year]).map(([class_, class_data]) => ({
        n: class_data.normalizedScoreRate,
        class: class_,
      })),
      totalRank: [],
    };
    ranks[year].goodOrExcellentRateRank.sort((a, b) => b.n - a.n);
    ranks[year].passingRateRank.sort((a, b) => b.n - a.n);
    ranks[year].normalizedScoreRank.sort((a, b) => b.n - a.n);
    for (const class_ in distribution[year]) {
      const tr =
        ranks[year].goodOrExcellentRateRank.findIndex(
          (a) => a.n === distribution[year][class_].goodOrExcellentRate
        ) +
        ranks[year].passingRateRank.findIndex(
          (a) => a.n === distribution[year][class_].passingRate
        ) +
        ranks[year].normalizedScoreRank.findIndex(
          (a) => a.n === distribution[year][class_].normalizedScoreRate
        );
      ranks[year].totalRank.push({
        n: tr,
        class: class_,
      });
      distribution[year][class_].totalRank = tr;
    }
    ranks[year].totalRank.sort((a, b) => a.n - b.n);
  }

  const yearOrder = Object.keys(distribution).sort((a, b) => getYearOrder(a) - getYearOrder(b));
  for (const year of yearOrder) {
    const classOrder = Object.keys(distribution[year]).sort((a, b) => {
      const numA = parseInt(a.split("班")[0]);
      const numB = parseInt(b.split("班")[0]);
      return numA - numB;
    });

    const aoa: any = [];

    aoa.push([
      { t: "s", v: "班级" },
      { t: "s", v: "参测人数" },
      { t: "s", v: "未测人数" },
      { t: "s", v: "优良率" },
      { t: "s", v: "排名" },
      { t: "s", v: "及格率" },
      { t: "s", v: "排名" },
      { t: "s", v: "平均分" },
      { t: "s", v: "排名" },
      { t: "s", v: "排名汇总" },
      { t: "s", v: "总排名" },
    ]);

    for (const class_ of classOrder) {
      aoa.push([
        { t: "s", v: class_ },
        { t: "s", v: distribution[year][class_].participation },
        { t: "s", v: distribution[year][class_].notParticipation },
        {
          t: "s",
          v:
            (
              (distribution[year][class_].goodOrExcellent /
                distribution[year][class_].participation) *
              100
            ).toFixed(1) + "%",
        },
        {
          t: "s",
          v:
            ranks[year].goodOrExcellentRateRank.findIndex(
              (a) => a.n === distribution[year][class_].goodOrExcellentRate
            ) + 1,
        },
        {
          t: "s",
          v:
            (
              (distribution[year][class_].passing / distribution[year][class_].participation) *
              100
            ).toFixed(1) + "%",
        },
        {
          t: "s",
          v:
            ranks[year].passingRateRank.findIndex(
              (a) => a.n === distribution[year][class_].passingRate
            ) + 1,
        },
        {
          t: "s",
          v: (
            distribution[year][class_].totalNormalizedScore /
            distribution[year][class_].participation
          ).toFixed(2),
        },
        {
          t: "s",
          v:
            ranks[year].normalizedScoreRank.findIndex(
              (a) => a.n === distribution[year][class_].normalizedScoreRate
            ) + 1,
        },
        { t: "s", v: (ranks[year].totalRank.find((a) => a.class === class_)?.n ?? 0) + 3 },
        {
          t: "s",
          v:
            ranks[year].totalRank.findIndex((a) => a.n === distribution[year][class_].totalRank) +
            1,
        },
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, ws, year);
  }

  const fileData = XLSX.write(workbook, {
    compression: true,
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;

  return fileData;
}
