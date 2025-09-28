import { entity, school } from "@/db/schema/auth";
import {
  exerciseNameEnum,
  fileProcessMessageSeverityEnum,
  fileProcessStatusEnum,
  fileRequestNatureEnum,
  recordNatureEnum,
} from "@/db/schema/enum";
import { sql } from "drizzle-orm";
import { boolean, pgTable, real, smallint, text, timestamp } from "drizzle-orm/pg-core";

// export const measureType = pgTable("measure_type", {
//   id: text("id")
//     .primaryKey()
//     .default(sql`gen_random_uuid()`),
//   testName: testNameEnum("test_name").notNull().unique(),
//   exerciseName: exerciseNameEnum("exercise_name").unique(),
//   unit: text("unit").notNull(),
//   canBeExercised: boolean("can_be_exercised").notNull().default(false),
//   exerciseScoreCalculationMethod: exerciseScoreCalculationMethodEnum(
//     "exercise_score_calculation_method"
//   ),
//   isDerived: boolean("is_derived").notNull().default(false),
//   applicableToGender: applicableToGenderEnum("applicable_to_gender").notNull(),
//   applicableToGeneralClassification: text("applicable_to_general_classification")
//     .notNull()
//     .references(() => generalClassification.id),
// });

// export const recordNature = pgTable("record_nature", {
//   id: text("id")
//     .primaryKey()
//     .default(sql`gen_random_uuid()`),
//   inSchool: boolean("in_school").notNull().default(false),
//   name: recordNatureEnum("name").notNull(),
// });

export const record = pgTable("record", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  recordType: text("record_type").notNull(),
  inSchool: boolean("in_school").notNull().default(false),
  nature: recordNatureEnum("nature").notNull(),
  fitnessTestId: text("fitness_test_id").references(() => fitnessTest.id),
  score: real("score"),
  normalizedScore: real("normalized_score"),
  additionalScore: real("additional_score"),
  exerciseDuration: smallint("exercise_duration"), //seconds, max 32766
  videoUrl: text("video_url"),
  toEntityClassification: text("to_entity_classification")
    .notNull()
    .references(() => classification.id),
  fromEntityClassification: text("from_entity_classification")
    .notNull()
    .references(() => classification.id),
  grade: text("grade"),
  isRedoOrMissingUpload: boolean("is_redo_or_missing_upload").notNull().default(false),
  isRedoOrMissingUploadTargetFitnesstTestId: text(
    "is_redo_or_missing_upload_target_fitnesst_test_id"
  ).references(() => fitnessTest.id),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const analysis = pgTable("analysis", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  analysis: text("analysis").notNull(),
  toEntityClassification: text("to_entity_classification")
    .notNull()
    .references(() => classification.id),
  fromEntityClassification: text("from_entity_classification")
    .notNull()
    .references(() => classification.id),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const exerciseSchedule = pgTable("exercise_schedule", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  exerciseType: exerciseNameEnum("exercise_type").notNull(),
  frequency: smallint("frequency").notNull(), //twice
  unit: text("unit").notNull(), // per n weeks
  futureTimeRangeUnit: text("future_time_range_unit").notNull(), // for the next k weeks
  effectiveStartDate: timestamp("effective_start_date").notNull(), // start (t)
  effectiveEndDate: timestamp("effective_end_date").notNull(), // end (t + k)
  toEntityClassification: text("to_entity_classification")
    .notNull()
    .references(() => classification.id),
  fromEntityClassification: text("from_entity_classification")
    .notNull()
    .references(() => classification.id),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  //TODO: completable schedule?
});

/**
 * this table stores the classification of the entity
 * e.g. what year/class a student is in
 * an entity can have multiple classifications
 * e.g. a teacher is teaching in 2B,2C then there will be two records of different classes
 * if a teahcer oversees the whole year, then leave class blank
 * if a director oversees the whole school, then leave the year and class blank
 *
 * see excalidraw for more details
 */
// not linking to entitytype just yet, can refine later after clear requirements
// TODO: refine later

export const classification = pgTable("classification", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  schoolId: text("school_id")
    .notNull()
    .references(() => school.id),
  entityId: text("entity_id")
    .notNull()
    .references(() => entity.id),
  validFrom: timestamp("valid_from", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  }).notNull(),
  validTo: timestamp("valid_to", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  }),
});

export const permission = pgTable("permission", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entityId: text("entity_id")
    .notNull()
    .references(() => entity.id),
  canAccessSchoolInClassification: boolean("can_access_school_in_classification") // both school name and type
    .notNull()
    .default(false),
  canAccessClassInClassification: boolean("can_access_class_in_classification")
    .notNull()
    .default(false),
  canAccessYearInClassification: boolean("can_access_year_in_classification")
    .notNull()
    .default(false),
  canAccessSameEntityInternalIdInClassification: boolean(
    "can_access_same_entity_internal_id_in_classification"
  )
    .notNull()
    .default(false),
  canAccessChildEntityInternalIdInClassification: boolean(
    "can_access_child_entity_internal_id_in_classification"
  )
    .notNull()
    .default(false),
});

export const classificationMap = pgTable("classification_map", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  year: text("year"),
  class: text("class"),
  // classNumber: text("class_number"),
  classificationId: text("classification_id")
    .notNull()
    .references(() => classification.id),
});

// usage
// 1. classifying if exercise can be done in primary school/secondary/uni
// export const generalClassification = pgTable("general_classification", {
//   id: text("id")
//     .primaryKey()
//     .default(sql`gen_random_uuid()`),
// });

// export const generalClassificationMap = pgTable("general_classification_map", {
//   id: text("id")
//     .primaryKey()
//     .default(sql`gen_random_uuid()`),
//   schoolType: schoolTypeEnum("school_type"), //大学初高中小学
//   year: text("year"),
//   generalClassificationId: text("general_classification_id")
//     .notNull()
//     .references(() => generalClassification.id),
// });

// export const grading = pgTable(
//   "grading",
//   {
//     id: text("id")
//       .primaryKey()
//       .default(sql`gen_random_uuid()`),
//     measureTypeId: text("measure_type_id")
//       .notNull()
//       .references(() => measureType.id),
//     generalClassificationId: text("general_classification_id")
//       .notNull()
//       .references(() => generalClassification.id),
//     gender: applicableToGenderEnum("gender").notNull(),
//     score: real("score"),
//     scoreUpperRange: real("score_upper_range"),
//     scoreLowerRange: real("score_lower_range"),
//     normalizedScore: real("normalized_score").notNull(),
//     grade: text("grade").notNull(),
//   },
//   (table) => [
//     check("score_range", sql`score_upper_range > score_lower_range`),
//     check(
//       "either_score_or_score_range",
//       sql`(score IS NOT NULL AND score_upper_range IS NULL AND score_lower_range IS NULL) OR (score IS NULL AND ( score_upper_range IS NOT NULL OR score_lower_range IS NOT NULL))`
//     ),
//   ]
// );

// export const fitnessTestCombinedGrading = pgTable("fitness_test_combined_grading", {
//   id: text("id")
//     .primaryKey()
//     .default(sql`gen_random_uuid()`),
//   normalizedScoreGreaterThanOrEqualTo: real("normalized_score_greater_than_or_equal_to").notNull(),
//   normalizedScoreLessThan: real("normalized_score_less_than").notNull(),
//   name: text("name").notNull().unique(),
// });

// export const fitnessTestWeighting = pgTable(
//   "fitness_test_weighting",
//   {
//     id: text("id")
//       .primaryKey()
//       .default(sql`gen_random_uuid()`),
//     measureTypeId: text("measure_type_id")
//       .notNull()
//       .references(() => measureType.id),
//     generalClassificationId: text("general_classification_id")
//       .notNull()
//       .references(() => generalClassification.id),
//     weighting: real("weighting").notNull(),
//   },
//   (table) => [
//     uniqueIndex("unique_weighting").on(table.measureTypeId, table.generalClassificationId),
//   ]
// );

// export const additionalScore = pgTable(
//   "additional_score",
//   {
//     id: text("id")
//       .primaryKey()
//       .default(sql`gen_random_uuid()`),
//     measureTypeId: text("measure_type_id")
//       .notNull()
//       .references(() => measureType.id),
//     generalClassificationId: text("general_classification_id")
//       .notNull()
//       .references(() => generalClassification.id),
//     gender: text("gender"),
//     offset: real("offset"),
//     offsetCondition: offsetConditionEnum("offset_condition").notNull(),
//     additionalScore: real("additional_score").notNull(),
//   },
//   (table) => [
//     uniqueIndex("unique_additional_score").on(
//       table.measureTypeId,
//       table.generalClassificationId,
//       table.gender,
//       table.offset
//     ),
//   ]
// );

// TODO: return prev generated test reports if data are same?
export const fitnessTest = pgTable("fitness_test", {
  // one per whole school
  // TODO: add logic to generate results
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  schoolId: text("school_id")
    .notNull()
    .references(() => school.id),
  name: text("name").notNull(),
  fitnessTestDate: timestamp("fitness_test_date", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  }).notNull(),
});

export const fitnessTestOverallGrade = pgTable("fitness_test_overall_grade", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fitnessTestId: text("fitness_test_id")
    .notNull()
    .references(() => fitnessTest.id),
  baseScore: real("base_score").notNull(),
  additionalScore: real("additional_score").notNull(),
  grade: text("grade").notNull(),
  toClassification: text("to_classification")
    .notNull()
    .references(() => classification.id),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const fileProcess = pgTable("file_process", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fileRequestNature: fileRequestNatureEnum("file_request_nature").notNull(),
  isUploadRequested: boolean("is_upload_requested").notNull().default(false),
  isUploadedFileStored: boolean("is_uploaded_file_stored").notNull().default(false), // even if false, we will create a fileStorage entry, but path will only the filename instead of with drive names
  fileId: text("file_id").references(() => fileStorage.id),
  requestedAt: timestamp("requested_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  processStartDate: timestamp("process_start_date", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  processEndDate: timestamp("process_end_date", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  }),
  status: fileProcessStatusEnum("status").notNull(),
});

export const fileProcessMessage = pgTable("file_process_message", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fileProcessId: text("file_process_id")
    .notNull()
    .references(() => fileProcess.id),
  message: text("message").notNull(),
  severity: fileProcessMessageSeverityEnum("severity").notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const fileStorage = pgTable("file_storage", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
