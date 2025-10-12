import AdditionalScore_ from "@/data/persistent/additional_score.json";
import BMI_Grading_ from "@/data/persistent/BMI_grading.json";
import Grading_ from "@/data/persistent/grading.json";
import GradingRanking_ from "@/data/persistent/grading_ranking.json";
import measureType_ from "@/data/persistent/measure_type.json";
import type { EntityType } from "@/db/schema";
import type { Session } from "@/lib/types";
import type { EventContext } from "chartjs-plugin-annotation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const BMI_Grading = BMI_Grading_ as Record<
  string,
  Record<string, Record<string, Record<string, (number | (number | null)[])[]>>>
>;

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

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function drawPassingLineHorizontal(context: EventContext, word: string = "及格线") {
  const ctx = context.chart.ctx;
  const width = context.chart.canvas.width;
  const { x, y, x2, y2, options } = context.element;
  ctx.save();
  if (options.borderWidth) ctx.lineWidth = options.borderWidth as number;
  if (options.borderColor) {
    ctx.strokeStyle = options.borderColor as string;
    ctx.fillStyle = options.borderColor as string;
  }
  ctx.setLineDash([5, 5]);
  if (options.borderDashOffset) ctx.lineDashOffset = options.borderDashOffset as number;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(width, y2);
  ctx.font = "bold 12px";
  ctx.fillText(word, x2 + 12, y2 - 6);
  ctx.stroke();
  ctx.restore();
  return true;
}

export function drawPassingLineVertical(context: EventContext, word: string = "及格线") {
  const ctx = context.chart.ctx;
  const width = context.chart.canvas.width;
  const { x, y, x2, y2, options } = context.element;
  ctx.save();
  if (options.borderWidth) ctx.lineWidth = options.borderWidth as number;
  if (options.borderColor) {
    ctx.strokeStyle = options.borderColor as string;
    ctx.fillStyle = options.borderColor as string;
  }
  ctx.setLineDash([5, 5]);
  if (options.borderDashOffset) ctx.lineDashOffset = options.borderDashOffset as number;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, 0);
  ctx.font = "bold 12px";
  ctx.fillText(word, x + 6, y - 12);
  ctx.stroke();
  ctx.restore();
  return true;
}

export const mapYearToChineseFrontend = (year: string) => {
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

export const mapEntityTypeToChineseFrontend = (entityType: EntityType) => {
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

export const findTestScoresFrontend = (
  score: number,
  testName: string,
  gender: string,
  schoolType: string,
  year: string,
  isTest: boolean
) => {
  const r = {
    normalizedScore: 0,
    additionalScore: 0,
  };
  const measure = measureType.find((measure) =>
    isTest ? measure.testName === testName : measure.exerciseName === testName
  );
  if (!measure) {
    throw new Error(
      "measure not found, " + testName + ", " + gender + ", " + schoolType + ", " + year
    );
  }
  const compareDirection = measure.compareDirection;
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

export const findGradeFrontend = (normalizedScore: number | null) => {
  if (normalizedScore === null) return null;
  for (let i = 0; i < GradingRanking.length; i++) {
    if (normalizedScore >= GradingRanking[i][1]) {
      return GradingRanking[i][0];
    }
  }
  return GradingRanking[GradingRanking.length - 1][0];
};

export const findTestBMIScoreAndGradeFrontend = (
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
