import { db } from "@/db";
import {
  classification,
  classificationMap,
  entity,
  fitnessTest,
  record,
  school,
} from "@/db/schema";
import { findGrade, getWeightedSum } from "@/lib/util";
import { and, eq, SQL } from "drizzle-orm";
import XLSX from "xlsx-js-style";

export default async function exportSchoolTestPerStudent(
  schoolTestId: string,
  schoolId: string,
  isGenerateRedoOrMissing: "主测" | "补测" | "全部",
  entityId: string
): Promise<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();
  const aoa: any = [[]];

  const conditions: SQL[] = [eq(record.fitnessTestId, schoolTestId), eq(entity.id, entityId)];
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

  const scores: Record<
    string,
    {
      score: number | null;
      normalizedScore: number | null;
      additionalScore: number | null;
      grade: string | null;
    }
  > = {};

  for (const record_ of records_) {
    if (!scores[record_.recordType]) {
      scores[record_.recordType] = {
        score: record_.score,
        normalizedScore: record_.normalizedScore,
        additionalScore: record_.additionalScore,
        grade: record_.grade,
      };
    } else {
      // find best
      if (
        record_.normalizedScore &&
        record_.normalizedScore > (scores[record_.recordType].normalizedScore ?? 0)
      ) {
        scores[record_.recordType] = {
          score: record_.score,
          normalizedScore: record_.normalizedScore,
          additionalScore: record_.additionalScore,
          grade: record_.grade,
        };
      }
    }
  }

  let totalScore = 0;
  let totalAdditionalScore = 0;

  for (const record_ of records_) {
    totalScore += getWeightedSum(
      record_.normalizedScore ?? 0,
      record_.recordType,
      school_.schoolType,
      record_.year ?? "六年级"
    );
    totalAdditionalScore += record_.additionalScore ?? 0;
  }

  aoa[0] = [{ t: "s", v: "《国家学生体质健康标准》登记卡" }];
  aoa[1] = [
    { t: "s", v: "学校" },
    { t: "s", v: school_.name },
    null,
    { t: "s", v: "测评名称" },
    { t: "s", v: fitnessTest_.name },
  ];
  aoa[2] = [
    { t: "s", v: "姓名" },
    { t: "s", v: records_[0].name },
    { t: "s", v: "性别" },
    { t: "s", v: records_[0].gender },
    { t: "s", v: "学号" },
    { t: "s", v: records_[0].internalId },
  ];
  aoa[3] = [
    { t: "s", v: "班级" },
    { t: "s", v: (records_[0].year ?? "") + (records_[0].class ?? "") },
  ];
  aoa[4] = [
    { t: "s", v: "身高（厘米）" },
    { t: "s", v: scores["身高"]?.score ?? "" },
    { t: "s", v: "体重（千克）" },
    { t: "s", v: scores["体重"]?.score ?? "" },
  ];
  aoa[5] = [
    { t: "s", v: "单项指标" },
    { t: "s", v: "成绩" },
    { t: "s", v: "得分" },
    { t: "s", v: "等级" },
    { t: "s", v: "加分指标" },
    { t: "s", v: "成绩" },
    { t: "s", v: "附加分" },
  ];
  aoa[6] = [
    { t: "s", v: "体重指数（BMI）（千克/米²）" },
    { t: "s", v: scores["体重指数（BMI）"]?.score ?? "" },
    { t: "s", v: scores["体重指数（BMI）"]?.normalizedScore ?? "" },
    { t: "s", v: scores["体重指数（BMI）"]?.grade ?? "未测" },
    { t: "s", v: "一分钟跳绳（次）" },
    { t: "s", v: scores["一分钟跳绳"]?.score ?? "" },
    { t: "s", v: scores["一分钟跳绳"]?.additionalScore ?? "" },
  ];
  aoa[7] = [
    { t: "s", v: "肺活量（毫升）" },
    { t: "s", v: scores["肺活量"]?.score ?? "" },
    { t: "s", v: scores["肺活量"]?.normalizedScore ?? "" },
    { t: "s", v: scores["肺活量"]?.grade ?? "未测" },
    { t: "s", v: "学年总分" },
    { t: "s", v: (totalScore + totalAdditionalScore).toFixed(1) },
  ];

  aoa[8] = [
    { t: "s", v: "50 米跑（秒）" },
    { t: "s", v: scores["50米跑"]?.score ?? "" },
    { t: "s", v: scores["50米跑"]?.normalizedScore ?? "" },
    { t: "s", v: scores["50米跑"]?.grade ?? "未测" },
    { t: "s", v: "等级评定" },
    { t: "s", v: findGrade(totalScore + totalAdditionalScore) },
  ];

  aoa[9] = [
    { t: "s", v: "坐位体前屈（厘米）" },
    { t: "s", v: scores["坐位体前屈"]?.score ?? "" },
    { t: "s", v: scores["坐位体前屈"]?.normalizedScore ?? "" },
    { t: "s", v: scores["坐位体前屈"]?.grade ?? "未测" },
  ];

  aoa[10] = [
    { t: "s", v: "一分钟跳绳（次）" },
    { t: "s", v: scores["一分钟跳绳"]?.score ?? "" },
    { t: "s", v: scores["一分钟跳绳"]?.normalizedScore ?? "" },
    { t: "s", v: scores["一分钟跳绳"]?.grade ?? "未测" },
  ];
  aoa[11] = [
    { t: "s", v: "一分钟仰卧起坐（次）" },
    { t: "s", v: scores["一分钟仰卧起坐"]?.score ?? "" },
    { t: "s", v: scores["一分钟仰卧起坐"]?.normalizedScore ?? "" },
    { t: "s", v: scores["一分钟仰卧起坐"]?.grade ?? "未测" },
    { t: "s", v: "体育教师签字" },
  ];
  if (records_[0].year === "六年级") {
    aoa[12] = [
      { t: "s", v: "50米×8往返跑（秒）" },
      { t: "s", v: scores["50米×8往返跑"]?.score ?? "" },
      { t: "s", v: scores["50米×8往返跑"]?.normalizedScore ?? "" },
      { t: "s", v: scores["50米×8往返跑"]?.grade ?? "未测" },
      { t: "s", v: "班主任签字" },
    ];
  }

  aoa[13] = [
    { t: "s", v: "" },
    { t: "s", v: "" },
    { t: "s", v: "" },
    { t: "s", v: "" },
    { t: "s", v: "班主任签字" },
  ];

  aoa[14] = [
    { t: "s", v: "" },
    { t: "s", v: "" },
    { t: "s", v: "" },
    { t: "s", v: "" },
    { t: "s", v: "家长签字" },
  ];
  aoa[15] = [
    { t: "s", v: "标准分" },
    { t: "s", v: (totalScore + totalAdditionalScore).toFixed(1) },
    null,
    { t: "s", v: "附加分" },
    { t: "s", v: totalAdditionalScore.toFixed(1) },
    { t: "s", v: "备注" },
    { t: "s", v: "" },
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    XLSX.utils.decode_range("A1:G1"),
    XLSX.utils.decode_range("B2:C2"),
    XLSX.utils.decode_range("E2:G2"),
    XLSX.utils.decode_range("F3:G3"),
    XLSX.utils.decode_range("B4:C4"),
    XLSX.utils.decode_range("E4:G4"),
    XLSX.utils.decode_range("E5:G5"),
    XLSX.utils.decode_range("F8:G8"),
    XLSX.utils.decode_range("F9:G9"),
    XLSX.utils.decode_range("F10:G10"),
    XLSX.utils.decode_range("F11:G11"),
    XLSX.utils.decode_range("F12:G12"),
    XLSX.utils.decode_range("F13:G13"),
    XLSX.utils.decode_range("F14:G14"),
    XLSX.utils.decode_range("F15:G15"),
  ];
  ws["A1"].s = {
    font: {
      bold: true,
      size: 14,
    },
  };
  const col_widths = [28, 10, 13, 10, 23, 7, 9];
  ws["!cols"] = col_widths.map((width) => ({ wch: width }));
  if (!ws["!rows"]) ws["!rows"] = [];
  for (let i = 0; i < 16; i++) {
    ws["!rows"].push({ hpx: 25 });
  }

  for (const col of ["A", "B", "C", "D", "E", "F", "G"]) {
    ws[`${col}6`].s = {
      font: {
        bold: true,
        size: 11,
      },
    };
    for (const row of [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
    ]) {
      ws[`${col}${row}`] = {
        ...(ws[`${col}${row}`] || {
          t: "s",
          v: "",
        }),
        s: {
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

  ws["A1"].s = {
    ...(ws["A1"].s || {}),
    font: {
      bold: true,
      size: 14,
    },
  };

  XLSX.utils.book_append_sheet(workbook, ws, "成绩单");

  return XLSX.write(workbook, {
    compression: true,
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
}
