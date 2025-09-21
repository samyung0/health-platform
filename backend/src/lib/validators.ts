import { z } from "zod";

// for validating query arrays:
// https://github.com/honojs/hono/issues/4103#issuecomment-2831967135

export const createRecordValidator = z
  .object({
    measureTypeId: z.string(),
    recordNatureId: z.string(),
    toEntityClassification: z.string(),
    score: z.number(),
    videoUrl: z.string().optional(),
  })
  .strict();

export const getRecordsQueryValidator = z
  .object({
    validFromYear: z.string().optional(),
    validToYear: z.string().optional(),
  })
  .strict();

export const updateRecordValidator = z
  .object({
    score: z.number().optional(),
    videoUrl: z.string().optional(),
  })
  .strict();

export const createExerciseScheduleValidator = z
  .object({
    exerciseId: z.string(),
    frequency: z.number(),
    unit: z.string(),
    futureTimeRangeUnit: z.string(),
    effectiveStartDate: z.date(),
    effectiveEndDate: z.date(),
    toEntityClassification: z.string(),
  })
  .strict();

export const getExerciseSchedulesQueryValidator = z
  .object({
    validFromYear: z.string().optional(),
    validToYear: z.string().optional(),
  })
  .strict();

export const updateExerciseScheduleValidator = z
  .object({
    exerciseId: z.string().optional(),
    frequency: z.number().optional(),
    unit: z.string().optional(),
    futureTimeRangeUnit: z.string().optional(),
    effectiveStartDate: z.date().optional(),
    effectiveEndDate: z.date().optional(),
  })
  .strict();
