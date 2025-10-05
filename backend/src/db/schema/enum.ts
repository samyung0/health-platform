import { pgEnum } from "drizzle-orm/pg-core";
import { z } from "zod";

export const testNameEnum = pgEnum("test_name", [
  "身高",
  "体重",
  "体重指数（BMI）",
  "肺活量",
  "50米跑",
  "坐位体前屈",
  "一分钟跳绳",
  "一分钟仰卧起坐",
  "50米×8往返跑",
  "立定跳远",
  "引体向上",
  "1000米跑",
  "800米跑",
]);
export const testNameEnumSchema = z.enum(testNameEnum.enumValues);
export type TestName = z.infer<typeof testNameEnumSchema>;

export const exerciseNameEnum = pgEnum("exercise_name", [
  "体重指数（BMI）",
  "50米跑",
  "坐位体前屈",
  "跳绳",
  "仰卧起坐",
  "50米×8往返跑",
  "立定跳远",
  "引体向上",
  "1000米跑",
  "800米跑",
]);
export const exerciseNameEnumSchema = z.enum(exerciseNameEnum.enumValues);
export type ExerciseName = z.infer<typeof exerciseNameEnumSchema>;

export const exerciseToTestMapping = {
  "50米跑": "50米跑",
  坐位体前屈: "坐位体前屈",
  跳绳: "一分钟跳绳",
  仰卧起坐: "一分钟仰卧起坐",
  "50米×8往返跑": "50米×8往返跑",
  立定跳远: "立定跳远",
  引体向上: "引体向上",
  "1000米跑": "1000米跑",
  "800米跑": "800米跑",
  "体重指数（BMI）": "体重指数（BMI）",
} satisfies Record<ExerciseName, TestName>;

export const recordNatureEnum = pgEnum("name", ["exercise", "test"]);
export const recordNatureEnumSchema = z.enum(recordNatureEnum.enumValues);
export type RecordNature = z.infer<typeof recordNatureEnumSchema>;

export const schoolTypeEnum = pgEnum("school_type", ["大学", "初中", "高中", "小学"]);
export const schoolTypeEnumSchema = z.enum(schoolTypeEnum.enumValues);
export type SchoolType = z.infer<typeof schoolTypeEnumSchema>;

// TODO: videos?
export const fileRequestNatureEnum = pgEnum("nature", [
  "schoolTest",
  "schoolExercise",
  "studentInfo",
]);
export const fileRequestNatureEnumSchema = z.enum(fileRequestNatureEnum.enumValues);
export type FileRequestNature = z.infer<typeof fileRequestNatureEnumSchema>;

export const fileProcessStatusEnum = pgEnum("file_process_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const fileProcessStatusEnumSchema = z.enum(fileProcessStatusEnum.enumValues);
export type FileProcessStatus = z.infer<typeof fileProcessStatusEnumSchema>;

export const fileProcessMessageSeverityEnum = pgEnum("file_process_message_severity", [
  "error",
  "warning",
  "info",
]);
export const fileProcessMessageSeverityEnumSchema = z.enum(
  fileProcessMessageSeverityEnum.enumValues
);
export type FileProcessMessageSeverity = z.infer<typeof fileProcessMessageSeverityEnumSchema>;

export const entityTypeEnum = pgEnum("entity_type", [
  "student",
  "parent",
  "classTeacher",
  "formTeacher",
  "schoolDirector",
  "principal",
  "admin",
]);

export const entityTypeEnumSchema = z.enum(entityTypeEnum.enumValues);
export type EntityType = z.infer<typeof entityTypeEnumSchema>;
