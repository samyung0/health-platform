import { OffsetCondition } from "@/db/schema";

const data = [
  // isExercise: running, jumping, etc can be in an exercise schedule
  // notExercise: height, weight, etc cannot be in an exercise schedule
  {
    name: "一分钟跳绳",
    unit: "次",
    isExercise: true,
    schoolType: "小学", // exactly two words
    year: "一年级", // exactly three words or null
    gender: "男", // exactly one word
    offset: 40, // negative values if condition is smaller than min
    offsetCondition: "greater_than_max",
    additionalScore: 20,
  },
] as {
  name: string;
  unit: string;
  isExercise: boolean;
  schoolType: string;
  year?: string;
  gender: string;
  offset: number;
  offsetCondition: OffsetCondition;
  additionalScore: number;
}[];

export default data;
