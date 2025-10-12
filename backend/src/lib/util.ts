import AdditionalScore_ from "@/data/persistent/additional_score.json";
import BMI_Grading_ from "@/data/persistent/BMI_grading.json";
import Grading_ from "@/data/persistent/grading.json";
import GradingRanking_ from "@/data/persistent/grading_ranking.json";
import { db } from "@/db";
import { classification, classificationMap, EntityType, permission } from "@/db/schema";
import { Session } from "@/lib/types";
import { and, count, eq, gt, isNotNull } from "drizzle-orm";

const Grading = Grading_ as Record<
  string,
  Record<string, Record<string, Record<string, number[][]>>>
>;

const AdditionalScore = AdditionalScore_ as Record<
  string,
  {
    type: "more_than_max" | "less_than_min";
    data: Record<string, Record<string, Record<string, number[][]>>>;
  }
>;

const GradingRanking = GradingRanking_ as [string, number][];

const BMI_Grading = BMI_Grading_ as Record<
  string,
  Record<string, Record<string, Record<string, (number | (number | null)[])[]>>>
>;

export const mapYearToChinese = (year: string) => {
  if (year.length > 3) throw new Error("Year is too long: " + year);
  // only 1 to 6 or is chinese already
  const digit = year.slice(0, 1);
  if (digit === "1") {
    return "一年级";
  } else if (digit === "2") {
    return "二年级";
  } else if (digit === "3") {
    return "三年级";
  } else if (digit === "4") {
    return "四年级";
  } else if (digit === "5") {
    return "五年级";
  } else if (digit === "6") {
    return "六年级";
  }
  return year;
};

export const parseBaseScore = (score: string | null | undefined) => {
  if (score === null || score === undefined) return null;
  return Number(score);
  // // parse to 3 significant digits
  // const roundedScore = Number(score).toPrecision(3);
  // return Number(roundedScore);
};

export const findTestScores = (
  score: number,
  testName: string,
  gender: string,
  schoolType: string,
  year: string,
  compareDirection: string
) => {
  const r = {
    normalizedScore: 0,
    additionalScore: 0,
  };
  if (compareDirection === "any") {
    throw new Error(
      "compareDirection cannot be any, " +
        testName +
        ", " +
        gender +
        ", " +
        schoolType +
        ", " +
        year
    );
  }
  const scoreArray = Grading[testName]?.[gender]?.[schoolType]?.[year];
  if (!scoreArray) {
    throw new Error(
      "scoreArray not found, " + testName + ", " + gender + ", " + schoolType + ", " + year
    );
  }
  for (let i = 0; i < scoreArray.length; i++) {
    if (compareDirection === "lower" && score <= scoreArray[i][1]) {
      const offset = score - scoreArray[i][1];
      r.normalizedScore = scoreArray[i][0];
      if (
        i === 0 &&
        offset < 0 &&
        AdditionalScore.hasOwnProperty(testName) &&
        AdditionalScore[testName].type === "less_than_min"
      ) {
        // find additional score
        const additionalScoreArray = AdditionalScore[testName]?.data[gender]?.[schoolType]?.[year];
        if (!additionalScoreArray) {
          throw new Error(
            "additionalScoreArray not found, " +
              testName +
              ", " +
              gender +
              ", " +
              schoolType +
              ", " +
              year
          );
        }
        for (let j = 0; j < additionalScoreArray.length; j++) {
          if (additionalScoreArray[j][1] >= offset) {
            r.additionalScore = additionalScoreArray[j][0];
            break;
          }
        }
      }

      break;
    } else if (compareDirection === "higher" && score >= scoreArray[i][1]) {
      const offset = score - scoreArray[i][1];
      r.normalizedScore = scoreArray[i][0];
      if (
        i === 0 &&
        offset > 0 &&
        AdditionalScore.hasOwnProperty(testName) &&
        AdditionalScore[testName].type === "more_than_max"
      ) {
        // find additional score
        const additionalScoreArray = AdditionalScore[testName]?.data[gender]?.[schoolType]?.[year];
        if (!additionalScoreArray) {
          throw new Error(
            "additionalScoreArray not found, " +
              testName +
              ", " +
              gender +
              ", " +
              schoolType +
              ", " +
              year
          );
        }
        for (let j = 0; j < additionalScoreArray.length; j++) {
          if (additionalScoreArray[j][1] <= offset) {
            r.additionalScore = additionalScoreArray[j][0];
            break;
          }
        }
      }

      break;
    }
  }
  return r;
};

export const findTestBMIScoreAndGrade = (
  score: number,
  gender: string,
  schoolType: string,
  year: string
) => {
  const r: { normalizedScore: number; grade: string | null } = {
    normalizedScore: 0,
    grade: null,
  };
  const scoreArray = BMI_Grading[gender]?.[schoolType]?.[year];
  if (!scoreArray) {
    throw new Error("scoreArray not found, " + gender + ", " + schoolType + ", " + year);
  }
  for (const [key, [normalizedScore_, range_]] of Object.entries(scoreArray)) {
    const normalizedScore = normalizedScore_ as number;
    const range = range_ as (number | null)[];
    if (score <= (range[1] ?? Infinity) && score >= (range[0] ?? -Infinity)) {
      r.normalizedScore = normalizedScore;
      r.grade = key;
      break;
    }
  }
  if (r.grade === null) {
    throw new Error("BMI grade not found, " + gender + ", " + schoolType + ", " + year);
  }
  return r;
};

export const findGrade = (normalizedScore: number | null) => {
  if (normalizedScore === null) return null;
  for (let i = 0; i < GradingRanking.length; i++) {
    if (normalizedScore >= GradingRanking[i][1]) {
      return GradingRanking[i][0];
    }
  }
  return GradingRanking[GradingRanking.length - 1][0];
};

export function* chunk<T>(data: readonly T[], size?: number) {
  const MAX_PARAMETERS = Math.pow(2, 16) - 2;
  const parametersPerRecord = data[0] ? Object.keys(data[0]).length : 1;
  const maxSize = Math.floor(MAX_PARAMETERS / parametersPerRecord);

  if (!size || size > maxSize) size = maxSize;

  for (let i = 0; i < data.length; i += size) {
    yield data.slice(i, i + size);
  }
}

export const checkValidSession = (session: Session | null): [Session, EntityType] => {
  if (!session || session.allClassifications.length === 0) {
    throw new Error("Unauthorized");
  }
  if (
    !session.allClassifications.every(
      (classification) => classification.entityId === session.allClassifications[0].entityId
    )
  ) {
    throw new Error("Unauthorized");
  }
  // student or parent can access without active classifications
  if (
    session.allClassifications.every(
      (classification) =>
        classification.entityType === "student" || classification.entityType === "parent"
    )
  ) {
    return [session!, session.allClassifications[0].entityType];
  }
  if (session.activeClassifications.length === 0) {
    throw new Error("Unauthorized");
  }
  if (session.activeClassifications.length > 1) {
    console.warn("Multiple active classifications found", session.activeClassifications);
    if (
      session.activeClassifications[0].entityType !== session.activeClassifications[1].entityType
    ) {
      throw new Error("Unauthorized");
    }
  }
  return [session!, session.activeClassifications[0].entityType];
};

export const checkValidClassification = <
  T extends Record<string, any> & { validTo: Date | null | undefined }
>(
  classification: T
) => {
  return !classification.validTo || Date.now() < classification.validTo.getTime();
};

export const getAllYearsAndClasses = async (
  schoolId: string
): Promise<Record<string, [string, number][]>> => {
  const group = (await db
    .select({
      year: classificationMap.year,
      class: classificationMap.class,
      totalStudents: count(),
    })
    .from(classificationMap)
    .groupBy(classificationMap.year, classificationMap.class)
    .where(
      and(
        isNotNull(classificationMap.year),
        isNotNull(classificationMap.class),
        gt(classification.validTo, new Date(Date.now())),
        eq(classification.schoolId, schoolId)
      )
    )
    .innerJoin(classification, eq(classificationMap.classificationId, classification.id))) as {
    year: string;
    class: string;
    totalStudents: number;
  }[];

  return group.reduce((acc, curr) => {
    acc[mapYearToChinese(curr.year)] = [
      ...(acc[mapYearToChinese(curr.year)] || []),
      [curr.class, curr.totalStudents],
    ];
    return acc;
  }, {} as Record<string, [string, number][]>);
};

export const getQueryableYearsAndClasses = async (
  session: Session,
  entityType: EntityType
): Promise<Record<string, string[]>> => {
  if (
    session.activeClassifications.length === 0 ||
    (!session.activeClassifications[0].canAccessSchoolInClassification &&
      !session.activeClassifications[0].canAccessYearInClassification &&
      !session.activeClassifications[0].canAccessClassInClassification)
  ) {
    return {};
  }
  const [permission_] = await db
    .select()
    .from(permission)
    .where(eq(permission.entityId, session.allClassifications[0].entityId))
    .limit(1);
  const allYearsAndClasses = await getAllYearsAndClasses(session.allClassifications[0].schoolId);
  const allYearsAndClassesWithoutStudentCount = {} as Record<string, string[]>;
  for (const year in allYearsAndClasses) {
    allYearsAndClassesWithoutStudentCount[year] = allYearsAndClasses[year].map(
      ([class_, totalStudents]) => class_
    );
  }
  if (permission_.canAccessSchoolInClassification) {
    // remove student count
    return allYearsAndClassesWithoutStudentCount;
  }
  if (permission_.canAccessClassInClassification) {
    const entityYear = session.activeClassifications[0].year;
    const entityClass = session.activeClassifications[0].class;
    if (entityYear && entityClass) {
      return {
        [entityYear]: [entityClass],
      };
    }
    return {};
  }
  if (permission_.canAccessYearInClassification) {
    const entityYear = session.activeClassifications[0].year;
    if (entityYear) {
      return {
        [entityYear]: allYearsAndClassesWithoutStudentCount[entityYear],
      };
    }
    return {};
  }
  return {};
};

export const mapEntityTypeToChinese = (entityType: EntityType) => {
  if (entityType === "student") {
    return "学生";
  } else if (entityType === "parent") {
    return "家长";
  } else if (entityType === "classTeacher") {
    return "教师";
  } else if (entityType === "formTeacher") {
    return "年级主任";
  } else if (entityType === "schoolDirector") {
    return "校领导";
  } else if (entityType === "principal") {
    return "校长";
  } else if (entityType === "admin") {
    return "管理员";
  }
  return entityType;
};

export const getYearOrder = (year: string) => {
  if (year === "一年级") {
    return 1;
  } else if (year === "二年级") {
    return 2;
  } else if (year === "三年级") {
    return 3;
  } else if (year === "四年级") {
    return 4;
  } else if (year === "五年级") {
    return 5;
  } else if (year === "六年级") {
    return 6;
  }
  return 99;
};

export const getWeightedSum = (score: number, type: string, schoolType: string, year: string) => {
  switch (type) {
    case "体重指数（BMI）":
      return score * 0.15;
    case "肺活量":
      return score * 0.15;
    case "50米跑":
      return score * 0.2;
    case "坐位体前屈":
      return (
        score *
        (schoolType === "小学" && (year === "一年级" || year === "二年级")
          ? 0.3
          : schoolType === "小学" && (year === "三年级" || year === "四年级")
          ? 0.2
          : 0.1)
      );
    case "一分钟跳绳":
      return (
        score *
        (schoolType === "小学" &&
        (year === "一年级" || year === "二年级" || year === "三年级" || year === "四年级")
          ? 0.2
          : 0.1)
      );
    case "一分钟仰卧起坐":
      return (
        score *
        (schoolType === "小学" && (year === "三年级" || year === "四年级")
          ? 0.1
          : schoolType === "小学" && (year === "五年级" || year === "六年级")
          ? 0.2
          : 0)
      );
    case "50米×8往返跑":
      return score * (schoolType === "小学" && (year === "五年级" || year === "六年级") ? 0.1 : 0);
    default:
      return 0;
  }
};

export const getPermission = (session: Session | null) => {
  const ret = {
    canSeeWholeSchool: false,
    canSeeWholeYear: false,
    canSeeWholeClass: false,
    canSeeSelf: false,
    canUploadSchoolTest: false,
    canUploadStudentInfo: false,
  };
  if (!session) return ret;
  ret.canSeeWholeSchool =
    session.activeClassifications.length > 0 &&
    session.activeClassifications[0].canAccessSchoolInClassification;
  ret.canSeeWholeYear =
    session.activeClassifications.length > 0 &&
    (session.activeClassifications[0].canAccessYearInClassification ||
      session.activeClassifications[0].canAccessSchoolInClassification);
  ret.canSeeWholeClass =
    session.activeClassifications.length > 0 &&
    (session.activeClassifications[0].canAccessClassInClassification ||
      session.activeClassifications[0].canAccessSchoolInClassification ||
      session.activeClassifications[0].canAccessYearInClassification);
  ret.canSeeSelf = !ret.canSeeWholeSchool && !ret.canSeeWholeYear && !ret.canSeeWholeClass;
  ret.canUploadSchoolTest =
    session.activeClassifications.length > 0 &&
    session.activeClassifications[0].canUploadSchoolTest;
  ret.canUploadStudentInfo =
    session.activeClassifications.length > 0 &&
    session.activeClassifications[0].canUploadStudentInfo;
  return ret;
};
