import { recordNatureEnumSchema } from "@/db/schema/enum";
import { z } from "zod";

// for validating query arrays:
// https://github.com/honojs/hono/issues/4103#issuecomment-2831967135

export const createRecordValidator = z
  .object({
    recordType: z.string(),
    inSchool: z.boolean(),
    nature: recordNatureEnumSchema,
    toEntityClassification: z.string(),
    score: z.number(),
    videoUrl: z.string().optional(),
    exerciseDuration: z.number().min(1).max(32766).optional(),
    grade: z.string(),
    isRedoOrMissingUpload: z.boolean().optional().default(false),
    isRedoOrMissingUploadTargetFitnesstTestId: z.string().optional(),
    normalizedScore: z.number(),
    additionalScore: z.number().optional(),
  })
  .strict();

export const getRecordsQueryValidator = z
  .object({
    classificationValidFromYear: z.string().optional(),
    classificationValidToYear: z.string().optional(),
  })
  .strict();

export const updateRecordValidator = z
  .object({
    recordType: z.string().optional(),
    inSchool: z.boolean().optional(),
    nature: recordNatureEnumSchema.optional(),
    score: z.number().optional(),
    videoUrl: z.string().optional(),
    exerciseDuration: z.number().min(1).max(32766).optional(),
    grade: z.string().optional(),
    isRedoOrMissingUpload: z.boolean().optional().default(false),
    isRedoOrMissingUploadTargetFitnesstTestId: z.string().optional(),
    normalizedScore: z.number().optional(),
    additionalScore: z.number().optional(),
  })
  .strict();

export const uploadSchoolTestValidator = z
  .object({
    file: z.instanceof(File),
    testDate: z.coerce.date(),
    recordTypes: z.string(),
    years: z.string(),
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
        const recordTypes = JSON.parse(data.recordTypes);
        console.log("Record types: ", recordTypes);
        if (
          !Array.isArray(recordTypes) ||
          recordTypes.length === 0 ||
          recordTypes.some((recordType) => typeof recordType !== "string")
        )
          return false;
      } catch (error) {
        console.error("Error parsing record types: ", error);
        return false;
      }
      return true;
    },
    {
      message: "系统错误，请重新刷新页面后重试",
    }
  )
  .refine(
    (data) => {
      try {
        const years = JSON.parse(data.years);
        return (
          Array.isArray(years) &&
          years.length > 0 &&
          years.every((year) => typeof year === "string" && year.endsWith("年级"))
        );
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
