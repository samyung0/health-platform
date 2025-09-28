import AdditionalScore_ from "@/data/persistent/additional_score.json";
import BMI_Grading_ from "@/data/persistent/BMI_grading.json";
import Grading_ from "@/data/persistent/grading.json";
import GradingRanking_ from "@/data/persistent/grading_ranking.json";

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
      if (i === 0) console.log("offset: ", offset);
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
