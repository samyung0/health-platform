const data = [
  // isExercise: running, jumping, etc can be in an exercise schedule
  // notExercise: height, weight, etc cannot be in an exercise schedule
  {
    name: "体重指数（BMI）",
    unit: "千克/米2",
    isExercise: false,
    schoolType: "小学", // exactly two words
    year: "一年级", // exactly three words or null
    gender: "男", // exactly one word
    scoreUpperRange: 18.1,
    scoreLowerRange: 13.5, // 1dp, no interpolation
    normalizedScore: 100,
    grade: "正常",
  },
  {
    name: "体重指数（BMI）",
    unit: "千克/米2",
    isExercise: false,
    schoolType: "小学",
    year: "一年级",
    gender: "男",
    scoreUpperRange: 13.4,
    normalizedScore: 100,
    grade: "正常",
  },
  {
    name: "肺活量",
    unit: "毫升",
    isExercise: false,
    schoolType: "小学",
    year: "一年级",
    gender: "男",
    score: 1700,
    normalizedScore: 100,
    grade: "优秀",
  },
] as (
  | {
      name: string;
      unit: string;
      isExercise: boolean;
      schoolType: string;
      year?: string;
      gender: string;
      scoreUpperRange?: number;
      scoreLowerRange?: number;
      normalizedScore: number;
      grade: string;
    }
  | {
      name: string;
      unit: string;
      isExercise: boolean;
      schoolType: string;
      year?: string;
      gender: string;
      score: number;
      normalizedScore: number;
      grade: string;
    }
)[];

export default data;
