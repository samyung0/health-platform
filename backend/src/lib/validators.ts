import { exerciseNameEnumSchema, recordNatureEnumSchema } from "@/db/schema/enum";
import { z } from "zod";

// for validating query arrays:
// https://github.com/honojs/hono/issues/4103#issuecomment-2831967135

export const getRecordsQueryValidator = z
  .object({
    classificationValidFromYear: z.string().optional(),
    classificationValidToYear: z.string().optional(),
  })
  .strict();

export const uploadHomeExerciseValidator = z
  .object({
    recordType: exerciseNameEnumSchema,
    exerciseDate: z.coerce.date(),
    exerciseDuration: z.number().optional(),
    score: z.number(),
    toEntityId: z.string(),
  })
  .strict();

export const uploadSchoolExerciseValidator = z
  .object({
    file: z.instanceof(File),
    exerciseDate: z.coerce.date(),
  })
  .strict();

export const uploadSchoolTestValidator = z
  .object({
    file: z.instanceof(File),
    testDate: z.coerce.date(),
    yearsAndClassesToProcess: z.string(),
    testName: z.string(),
    isCreateNewTest: z.string().transform((value) => {
      if (value.toLowerCase() === "true") {
        return true;
      } else if (value.toLowerCase() === "false") {
        return false;
      } else {
        throw new Error("The string must be 'true' or 'false'");
      }
    }),
    isRedoOrMissingUpload: z.string().transform((value) => {
      if (value.toLowerCase() === "true") {
        return true;
      } else if (value.toLowerCase() === "false") {
        return false;
      } else {
        throw new Error("The string must be 'true' or 'false'");
      }
    }),
  })
  .strict()
  .refine(
    (data) => {
      try {
        const years = JSON.parse(data.yearsAndClassesToProcess);
        const expectedYearsSchema = z.record(z.string(), z.array(z.string()));
        return expectedYearsSchema.safeParse(years).success;
      } catch (error) {
        console.error("Error parsing years: ", error);
        return false;
      }
    },
    {
      message: "系统错误，请重新刷新页面后重试",
    }
  )
  .refine(
    (data) => {
      if (data.isCreateNewTest) return true;
      const isValid =
        data.isCreateNewTest !== undefined && data.isRedoOrMissingUpload !== undefined;

      if (!isValid) {
        // TODO LOG ERROR
        console.error("Invalid data: ", data);
      }

      return isValid;
    },
    {
      message: "系统错误，请重新刷新页面后重试",
    }
  );

export const uploadStudentInfoValidator = z
  .object({
    file: z.instanceof(File),
    from: z.string(),
    to: z.string(),
  })
  .strict()
  .refine(
    (data) => {
      try {
        const from = Number(data.from);
        const to = Number(data.to);
        return !isNaN(from) && !isNaN(to) && from < to;
      } catch (error) {
        console.error("Error parsing dates: ", error);
        return false;
      }
    },
    {
      message: "系统错误，请重新刷新页面后重试",
    }
  );

export const downloadRawDataValidator = z
  .object({
    scopeToProcess: z.record(z.string(), z.string().array()), // form, classes, would be empty for parents and students
    inSchool: z.boolean(),
    nature: recordNatureEnumSchema,
    from: z.coerce.date(),
    to: z.coerce.date(),
    singleEntity: z.string().optional(),
  })
  .strict();

export const downloadSchoolTestReportsValidator = z
  .object({
    reportsToProcess: z.enum([
      "全校成绩总表",
      "班级排名统计表",
      "个人成绩单",
      "年级成绩总表",
      "班级成绩总表",
    ]),
    year: z.string().optional(),
    class: z.string().optional(),
    entityId: z.string().optional(),
    schoolTestId: z.string(),
    includeIsRedoOrMissingUpload: z.enum(["主测", "补测", "全部"]),
  })
  .strict()
  .refine(
    (data) => {
      if (data.reportsToProcess === "全校成绩总表" || data.reportsToProcess === "班级排名统计表") {
        return data.year === undefined && data.class === undefined && data.entityId === undefined;
      }
      if (data.reportsToProcess === "年级成绩总表") {
        return data.year !== undefined && data.class === undefined && data.entityId === undefined;
      }
      if (data.reportsToProcess === "班级成绩总表") {
        return data.year !== undefined && data.class !== undefined && data.entityId === undefined;
      }
      if (data.reportsToProcess === "个人成绩单") {
        return data.year === undefined && data.class === undefined && data.entityId !== undefined;
      }
      return false;
    },
    {
      message: "系统错误，请重新刷新页面后重试",
    }
  );
