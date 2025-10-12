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
import { and, eq, InferSelectModel, SQL } from "drizzle-orm";
import XLSX from "xlsx-js-style";

export default async function exportSchoolTestPerYear(
  schoolTestId: string,
  schoolId: string,
  isGenerateRedoOrMissing: "主测" | "补测" | "全部",
  year: string
): Promise<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();
  const aoa: any = [[]];

  const [school_] = await db.select().from(school).where(eq(school.id, schoolId));
  const [fitnessTest_] = await db
    .select()
    .from(fitnessTest)
    .where(eq(fitnessTest.id, schoolTestId));
  if (!school_ || !fitnessTest_) {
    throw new Error("School or fitness test not found");
  }
  const conditions: SQL[] = [
    eq(record.fitnessTestId, schoolTestId),
    eq(classificationMap.year, year),
  ];
  if (isGenerateRedoOrMissing !== "全部") {
    conditions.push(eq(record.isRedoOrMissingUpload, isGenerateRedoOrMissing === "补测"));
  }
  const records_ = await db
    .select({
      internalId: entity.internalId,
      score: record.score,
      grade: record.grade,
      normalizedScore: record.normalizedScore,
      additionalScore: record.additionalScore,
      gender: entity.gender,
      recordType: record.recordType,
      class: classificationMap.class,
      year: classificationMap.year,
      createdAt: record.createdAt,
      name: entity.name,
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
          grade: string | null;
          normalizedScore: number | null;
          additionalScore: number | null;
        }
      >;
      finalScore: number;
      finalAdditionalScore: number;
      finalTotalScore: string;
      finalGrade: string;
      gender: string;
      year: string;
      class: string;
      internalId: string;
      name: string;
      createdAt: Date;
      hasNonNullScore: boolean;
    }
  > = {};

  for (const record_ of records_) {
    if (!calculatedFinalScorePerStudent_[record_.internalId]) {
      calculatedFinalScorePerStudent_[record_.internalId] = {
        scores: {
          [record_.recordType]: {
            score: record_.score,
            grade: record_.grade,
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
        finalGrade: record_.grade ?? "",
        gender: record_.gender,
        year: record_.year!,
        class: record_.class!,
        internalId: record_.internalId,
        name: record_.name,
        createdAt: record_.createdAt,
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
          grade: record_.grade,
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
          grade: record_.grade,
          normalizedScore: record_.normalizedScore,
          additionalScore: record_.additionalScore,
        };
        if (record_.score !== null) {
          calculatedFinalScorePerStudent_[record_.internalId].hasNonNullScore = true;
        }
      }
    }
  }

  for (const internalId in calculatedFinalScorePerStudent_) {
    if (!calculatedFinalScorePerStudent_[internalId].hasNonNullScore) continue;
    const f =
      calculatedFinalScorePerStudent_[internalId].finalScore +
      calculatedFinalScorePerStudent_[internalId].finalAdditionalScore;
    calculatedFinalScorePerStudent_[internalId].finalTotalScore = f.toFixed(1);
    calculatedFinalScorePerStudent_[internalId].finalGrade = findGrade(f)!;
  }

  addHeaderInfo(
    aoa,
    {
      school: school_,
      fitnessTest: fitnessTest_,
      records: records_,
      isGenerateRedoOrMissing: isGenerateRedoOrMissing,
      calculatedFinalScorePerStudent: calculatedFinalScorePerStudent_,
    },
    year
  );

  add_student_data_header(aoa);

  const sortedDataLength = add_student_data(aoa, {
    records: records_,
    calculatedFinalScorePerStudent: calculatedFinalScorePerStudent_,
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  format(ws, sortedDataLength);

  XLSX.utils.book_append_sheet(workbook, ws, "成绩报告");

  const fileData = XLSX.write(workbook, {
    compression: true,
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;

  return fileData;
}

const addHeaderInfo = (
  aoa: any,
  data: {
    school: InferSelectModel<typeof school>;
    fitnessTest: InferSelectModel<typeof fitnessTest>;
    records: {
      internalId: string;
      score: number | null;
      grade: string | null;
      normalizedScore: number | null;
      additionalScore: number | null;
      gender: string;
      recordType: string;
    }[];
    isGenerateRedoOrMissing: "主测" | "补测" | "全部";
    calculatedFinalScorePerStudent: Record<
      string,
      {
        finalScore: number;
        finalAdditionalScore: number;
        finalTotalScore: string;
        finalGrade: string;
        gender: string;
        name: string;
        hasNonNullScore: boolean;
      }
    >;
  },
  year: string
) => {
  const gradeDistributionCalculated: Record<string, Record<string, number>> = {
    "体重指数（BMI）": {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    肺活量: {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    "50米跑": {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    坐位体前屈: {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    一分钟跳绳: {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    一分钟仰卧起坐: {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    "50米×8往返跑": {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
  };
  const totalDistributionCalculated: Record<string, number> = {
    优秀: 0,
    良好: 0,
    及格: 0,
    不及格: 0,
  };
  let totalMale = 0,
    totalFemale = 0,
    actualMale = 0,
    actualFemale = 0;

  const finalScoreByGender: Record<string, Record<string, number>> = {
    男: {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
    女: {
      优秀: 0,
      良好: 0,
      及格: 0,
      不及格: 0,
    },
  };

  for (let i = 0; i < data.records.length; i++) {
    if (
      data.records[i].score === null ||
      data.records[i].grade === null ||
      data.records[i].normalizedScore === null
    ) {
      continue;
    }
    if (!gradeDistributionCalculated[data.records[i].recordType]) {
      continue;
    }
    if (data.records[i].recordType === "体重指数（BMI）") {
      const grade = findGrade(data.records[i].normalizedScore!)!;
      gradeDistributionCalculated[data.records[i].recordType]![grade]++;
      totalDistributionCalculated[grade]++;
    } else {
      totalDistributionCalculated[data.records[i].grade!]++;
      gradeDistributionCalculated[data.records[i].recordType]![data.records[i].grade!]++;
    }
  }

  for (const [internalId, agg] of Object.entries(data.calculatedFinalScorePerStudent)) {
    if (!agg.hasNonNullScore) {
      if (agg.gender === "男") {
        totalMale++;
      } else {
        totalFemale++;
      }
      continue;
    }

    if (agg.gender === "男") {
      totalMale++;
      actualMale++;
    } else {
      totalFemale++;
      actualFemale++;
    }
    finalScoreByGender[agg.gender][agg.finalGrade]++;
  }

  // 第1行：基本信息
  aoa[0] = [
    null,
    // { t: "s", v: "单位名称：" },
    { t: "s", v: `${year}综合评级人数汇总统计` },
    null,
    null,
    null,
    { t: "s", v: "体质测定名称：" },
    {
      t: "s",
      v: `${data.fitnessTest.name}（${
        data.isGenerateRedoOrMissing === "全部" ? "主测 + 补测" : data.isGenerateRedoOrMissing
      }）`,
    },
    null,
    null,
    null,
    { t: "s", v: "各单项实查评价人数统计" },
    { t: "s", v: "等级" },
    null,
    { t: "s", v: "评分" },
    null,
    { t: "s", v: "体重指数（BMI）" },
    { t: "s", v: "肺活量" },
    { t: "s", v: "50米跑" },
    { t: "s", v: "坐位体前屈" },
    { t: "s", v: "一分钟跳绳" },
    { t: "s", v: "一分钟仰卧起坐" },
    { t: "s", v: "50米×8往返跑" },
    { t: "s", v: "综合等级" },
  ];

  aoa[1] = [
    null,
    { t: "s", v: "男" },
    { t: "s", v: "女" },
    { t: "s", v: "总人数" },
    { t: "s", v: "综合等级" },
    { t: "s", v: "评分a" },
    { t: "s", v: "男" },
    { t: "s", v: "女" },
    { t: "s", v: "合计" },
    { t: "s", v: "占比率%" },
    null,
    { t: "s", v: "一级（优秀）" },
    null,
    { t: "s", v: "a ≥ 90.0 分" },
    null,
    { t: "n", v: gradeDistributionCalculated["体重指数（BMI）"]["优秀"] },
    { t: "n", v: gradeDistributionCalculated["肺活量"]["优秀"] },
    { t: "n", v: gradeDistributionCalculated["50米跑"]["优秀"] },
    { t: "n", v: gradeDistributionCalculated["坐位体前屈"]["优秀"] },
    { t: "n", v: gradeDistributionCalculated["一分钟跳绳"]["优秀"] },
    { t: "n", v: gradeDistributionCalculated["一分钟仰卧起坐"]["优秀"] },
    { t: "n", v: gradeDistributionCalculated["50米×8往返跑"]["优秀"] },
    { t: "n", v: finalScoreByGender["男"]["优秀"] + finalScoreByGender["女"]["优秀"] },
  ];

  aoa[2] = [
    { t: "s", v: "应查人数" },
    { t: "n", v: totalMale },
    { t: "n", v: totalFemale },
    { t: "n", v: totalMale + totalFemale },
    { t: "s", v: "一级（优秀）" },
    { t: "s", v: "a ≥ 90.0 分" },
    { t: "n", v: finalScoreByGender["男"]["优秀"] },
    { t: "n", v: finalScoreByGender["女"]["优秀"] },
    { t: "n", v: finalScoreByGender["男"]["优秀"] + finalScoreByGender["女"]["优秀"] },
    {
      t: "s",
      v:
        (
          ((finalScoreByGender["男"]["优秀"] + finalScoreByGender["女"]["优秀"]) /
            (actualMale + actualFemale)) *
          100
        ).toFixed(1) + "%",
    },
    null,
    { t: "s", v: "二级（良好）" },
    null,
    { t: "s", v: "80.0 分≤a< 90.0分" },
    null,
    { t: "n", v: gradeDistributionCalculated["体重指数（BMI）"]["良好"] },
    { t: "n", v: gradeDistributionCalculated["肺活量"]["良好"] },
    { t: "n", v: gradeDistributionCalculated["50米跑"]["良好"] },
    { t: "n", v: gradeDistributionCalculated["坐位体前屈"]["良好"] },
    { t: "n", v: gradeDistributionCalculated["一分钟跳绳"]["良好"] },
    { t: "n", v: gradeDistributionCalculated["一分钟仰卧起坐"]["良好"] },
    { t: "n", v: gradeDistributionCalculated["50米×8往返跑"]["良好"] },
    { t: "n", v: finalScoreByGender["男"]["良好"] + finalScoreByGender["女"]["良好"] },
  ];

  aoa[3] = [
    { t: "s", v: "实查人数" },
    { t: "n", v: actualMale },
    { t: "n", v: actualFemale },
    { t: "n", v: actualMale + actualFemale },
    { t: "s", v: "二级（良好）" },
    { t: "s", v: "80.0 分≤a< 90.0分" },
    { t: "n", v: finalScoreByGender["男"]["良好"] },
    { t: "n", v: finalScoreByGender["女"]["良好"] },
    { t: "n", v: finalScoreByGender["男"]["良好"] + finalScoreByGender["女"]["良好"] },
    {
      t: "s",
      v:
        (
          ((finalScoreByGender["男"]["良好"] + finalScoreByGender["女"]["良好"]) /
            (actualMale + actualFemale)) *
          100
        ).toFixed(1) + "%",
    },
    null,
    { t: "s", v: "三级（及格）" },
    null,
    { t: "s", v: "60.0 分≤a< 80.0分" },
    null,
    { t: "n", v: gradeDistributionCalculated["体重指数（BMI）"]["及格"] },
    { t: "n", v: gradeDistributionCalculated["肺活量"]["及格"] },
    { t: "n", v: gradeDistributionCalculated["50米跑"]["及格"] },
    { t: "n", v: gradeDistributionCalculated["坐位体前屈"]["及格"] },
    { t: "n", v: gradeDistributionCalculated["一分钟跳绳"]["及格"] },
    { t: "n", v: gradeDistributionCalculated["一分钟仰卧起坐"]["及格"] },
    { t: "n", v: gradeDistributionCalculated["50米×8往返跑"]["及格"] },
    { t: "n", v: finalScoreByGender["男"]["及格"] + finalScoreByGender["女"]["及格"] },
  ];

  aoa[4] = [
    { t: "s", v: "实查比率%" },
    { t: "s", v: ((actualMale / totalMale) * 100).toFixed(1) + "%" },
    { t: "s", v: ((actualFemale / totalFemale) * 100).toFixed(1) + "%" },
    {
      t: "s",
      v: (((actualMale + actualFemale) / (totalMale + totalFemale)) * 100).toFixed(1) + "%",
    },
    { t: "s", v: "三级（及格）" },
    { t: "s", v: "60.0 分≤a< 80.0分" },
    { t: "n", v: finalScoreByGender["男"]["及格"] },
    { t: "n", v: finalScoreByGender["女"]["及格"] },
    { t: "n", v: finalScoreByGender["男"]["及格"] + finalScoreByGender["女"]["及格"] },
    {
      t: "s",
      v:
        (
          ((finalScoreByGender["男"]["及格"] + finalScoreByGender["女"]["及格"]) /
            (actualMale + actualFemale)) *
          100
        ).toFixed(1) + "%",
    },
    null,
    { t: "s", v: "四级（不及格）" },
    null,
    { t: "s", v: "a < 60.0 分" },
    null,
    { t: "n", v: gradeDistributionCalculated["体重指数（BMI）"]["不及格"] },
    { t: "n", v: gradeDistributionCalculated["肺活量"]["不及格"] },
    { t: "n", v: gradeDistributionCalculated["50米跑"]["不及格"] },
    { t: "n", v: gradeDistributionCalculated["坐位体前屈"]["不及格"] },
    { t: "n", v: gradeDistributionCalculated["一分钟跳绳"]["不及格"] },
    { t: "n", v: gradeDistributionCalculated["一分钟仰卧起坐"]["不及格"] },
    { t: "n", v: gradeDistributionCalculated["50米×8往返跑"]["不及格"] },
    { t: "n", v: finalScoreByGender["男"]["不及格"] + finalScoreByGender["女"]["不及格"] },
  ];

  aoa[5] = [
    null,
    null,
    null,
    null,
    { t: "s", v: "四级（不及格）" },
    { t: "s", v: "a < 60.0 分" },
    { t: "n", v: finalScoreByGender["男"]["不及格"] },
    { t: "n", v: finalScoreByGender["女"]["不及格"] },
    { t: "n", v: finalScoreByGender["男"]["不及格"] + finalScoreByGender["女"]["不及格"] },
    {
      t: "s",
      v:
        (
          ((finalScoreByGender["男"]["不及格"] + finalScoreByGender["女"]["不及格"]) /
            (actualMale + actualFemale)) *
          100
        ).toFixed(1) + "%",
    },
    null,
    { t: "s", v: "单项实查人数合计" },
    null,
    null,
    null,
    {
      t: "n",
      v: Object.values(gradeDistributionCalculated["体重指数（BMI）"]).reduce((a, b) => a + b, 0),
    },
    { t: "n", v: Object.values(gradeDistributionCalculated["肺活量"]).reduce((a, b) => a + b, 0) },
    { t: "n", v: Object.values(gradeDistributionCalculated["50米跑"]).reduce((a, b) => a + b, 0) },
    {
      t: "n",
      v: Object.values(gradeDistributionCalculated["坐位体前屈"]).reduce((a, b) => a + b, 0),
    },
    {
      t: "n",
      v: Object.values(gradeDistributionCalculated["一分钟跳绳"]).reduce((a, b) => a + b, 0),
    },
    {
      t: "n",
      v: Object.values(gradeDistributionCalculated["一分钟仰卧起坐"]).reduce((a, b) => a + b, 0),
    },
    {
      t: "n",
      v: Object.values(gradeDistributionCalculated["50米×8往返跑"]).reduce((a, b) => a + b, 0),
    },
    { t: "n", v: actualMale + actualFemale },
  ];

  aoa[6] = [];
};

const add_student_data_header = (aoa: any) => {
  aoa[7] = [
    { t: "s", v: "年级编号" },
    { t: "s", v: "班名" },
    { t: "s", v: "学号" },
    { t: "s", v: "姓名" },
    { t: "s", v: "性别" },
    { t: "s", v: "测量日期" },
    { t: "s", v: "身高（cm)" },
    { t: "s", v: "体重（kg)" },
    { t: "s", v: "体重指数BMI\n（千克/米2）" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "肺活量（毫升）" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "50米跑（秒）" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "坐位体前屈(cm)" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "一分钟跳绳（次）" },
    { t: "s", v: "得分" },
    { t: "s", v: "加分" },
    { t: "s", v: "等级" },
    { t: "s", v: "一分钟仰卧起坐（次）" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "50米*8往返跑（分.秒）" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "标准分" },
    { t: "s", v: "附加分" },
    { t: "s", v: "综合得分" },
    { t: "s", v: "综合评级" },
  ];
};

const add_student_data = (
  aoa: any,
  data: {
    records: {
      internalId: string;
      score: number | null;
      grade: string | null;
      normalizedScore: number | null;
      additionalScore: number | null;
      gender: string;
      recordType: string;
      class: string | null;
      year: string | null;
      createdAt: Date;
      name: string;
    }[];
    calculatedFinalScorePerStudent: Record<
      string,
      {
        scores: Record<
          string,
          {
            score: number | null;
            grade: string | null;
            normalizedScore: number | null;
            additionalScore: number | null;
          }
        >;
        finalScore: number;
        finalAdditionalScore: number;
        finalTotalScore: string;
        finalGrade: string;
        gender: string;
        year: string;
        class: string;
        internalId: string;
        name: string;
        createdAt: Date;
      }
    >;
  }
) => {
  const seen: Record<string, boolean> = {};
  const sortedData = data.records
    .filter((a) => {
      if (seen[a.internalId]) {
        return false;
      }
      seen[a.internalId] = true;
      return true;
    })
    .toSorted((a, b) => {
      if (!a.class || !b.class || !a.year || !b.year) {
        return 0;
      }
      if (a.year === b.year) {
        if (a.class === b.class) {
          return Number(a.internalId) - Number(b.internalId);
        }
        const numA = parseInt(a.class.split("班")[0]);
        const numB = parseInt(b.class.split("班")[0]);
        return numA - numB;
      }
      // compare year order
      return getYearOrder(a.year) - getYearOrder(b.year);
    });

  for (let i = 0; i < sortedData.length; i++) {
    const t = data.calculatedFinalScorePerStudent[sortedData[i].internalId];
    aoa[8 + i] = [
      { t: "s", v: t.year },
      { t: "s", v: t.class },
      { t: "s", v: t.internalId },
      { t: "s", v: t.name },
      { t: "s", v: t.gender },
      { t: "s", v: t.createdAt.toLocaleDateString() },
      { t: "s", v: t.scores["身高"]?.score ?? "" },
      { t: "s", v: t.scores["体重"]?.score ?? "" },
      { t: "s", v: t.scores["体重指数（BMI）"]?.score ?? "" },
      { t: "s", v: t.scores["体重指数（BMI）"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["体重指数（BMI）"]?.grade ?? "" },
      { t: "s", v: t.scores["肺活量"]?.score ?? "" },
      { t: "s", v: t.scores["肺活量"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["肺活量"]?.grade ?? "" },
      { t: "s", v: t.scores["50米跑"]?.score ?? "" },
      { t: "s", v: t.scores["50米跑"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["50米跑"]?.grade ?? "" },
      { t: "s", v: t.scores["坐位体前屈"]?.score ?? "" },
      { t: "s", v: t.scores["坐位体前屈"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["坐位体前屈"]?.grade ?? "" },
      { t: "s", v: t.scores["一分钟跳绳"]?.score ?? "" },
      { t: "s", v: t.scores["一分钟跳绳"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["一分钟跳绳"]?.additionalScore ?? "" },
      { t: "s", v: t.scores["一分钟跳绳"]?.grade ?? "" },
      { t: "s", v: t.scores["一分钟仰卧起坐"]?.score ?? "" },
      { t: "s", v: t.scores["一分钟仰卧起坐"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["一分钟仰卧起坐"]?.grade ?? "" },
      { t: "s", v: t.scores["50米×8往返跑"]?.score ?? "" },
      { t: "s", v: t.scores["50米×8往返跑"]?.normalizedScore ?? "" },
      { t: "s", v: t.scores["50米×8往返跑"]?.grade ?? "" },
      { t: "s", v: t.finalScore },
      { t: "s", v: t.finalAdditionalScore },
      { t: "s", v: t.finalTotalScore },
      { t: "s", v: t.finalGrade },
    ];
  }

  return sortedData.length;
};

const format = (ws: XLSX.WorkSheet, sortedDataLength: number) => {
  ws["!merges"] = [
    XLSX.utils.decode_range("B1:E1"),
    XLSX.utils.decode_range("G1:H1"),
    XLSX.utils.decode_range("K1:K6"),
  ];

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 34; j++) {
      const address = XLSX.utils.encode_cell({ r: i, c: j });
      if (!ws[address]) continue;
      ws[address].s = {
        alignment: { horizontal: "center", vertical: "center" },
        font: { bold: true },
      };
    }
  }

  const column_widths = [
    { wch: 11 },
    { wch: 19 },
    { wch: 9 },
    { wch: 9 },
    { wch: 15 },
    { wch: 19 },
    { wch: 10 },
    { wch: 24 },
    { wch: 10 },
    { wch: 10 },
    { wch: 24 },
    { wch: 18 },
    { wch: 10 },
    { wch: 21 },
    { wch: 10 },
    { wch: 17 },
    { wch: 10 },
    { wch: 10 },
    { wch: 11 },
    { wch: 17 },
    { wch: 17 },
    { wch: 17 },
    { wch: 10 },
    { wch: 21 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];

  ws["!cols"] = column_widths;

  for (const col of [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
  ]) {
    for (const row of ["1", "2", "3", "4", "5", "6"]) {
      ws[`${col}${row}`] = {
        ...(ws[`${col}${row}`] || {
          t: "s",
          v: "",
        }),
        s: {
          font: {
            bold: true,
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
          border: {
            top: {
              style: "thin",
              color: "#000000",
            },
            bottom: {
              style: "thin",
              color: "#000000",
            },
            left: {
              style: "thin",
              color: "#000000",
            },
            right: {
              style: "thin",
              color: "#000000",
            },
          },
        },
      };
    }
  }

  for (const col of [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "AA",
    "AB",
    "AC",
    "AD",
    "AE",
    "AF",
    "AG",
    "AH",
  ]) {
    for (const row of Array.from({ length: sortedDataLength + 1 }, (_, i) => i + 8).map(String)) {
      ws[`${col}${row}`] = {
        ...(ws[`${col}${row}`] || {
          t: "s",
          v: "",
        }),
        s: {
          border: {
            top: {
              style: "thin",
              color: "#000000",
            },
            bottom: {
              style: "thin",
              color: "#000000",
            },
            left: {
              style: "thin",
              color: "#000000",
            },
            right: {
              style: "thin",
              color: "#000000",
            },
          },
        },
      };
    }
  }
};
