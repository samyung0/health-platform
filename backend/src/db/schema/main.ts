import { entity, school } from "@/db/schema/auth";
import {
  exerciseNameEnum,
  fileProcessMessageSeverityEnum,
  fileProcessStatusEnum,
  fileRequestNatureEnum,
  recordNatureEnum,
} from "@/db/schema/enum";
import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, real, smallint, text, timestamp } from "drizzle-orm/pg-core";

export const record = pgTable("record", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  recordType: text("record_type").notNull(),
  inSchool: boolean("in_school").notNull().default(false),
  nature: recordNatureEnum("nature").notNull(),
  fitnessTestId: text("fitness_test_id").references(() => fitnessTest.id),
  score: real("score"),
  exerciseScore: real("exercise_score"),
  normalizedScore: real("normalized_score"),
  additionalScore: real("additional_score"),
  exerciseDuration: real("exercise_duration"), //minutes, max 32766
  exerciseDate: timestamp("exercise_date", {
    mode: "date",
    precision: 0,
  }),
  videoUrl: text("video_url"),
  toEntityClassification: text("to_entity_classification")
    .notNull()
    .references(() => classification.id),
  fromEntityClassification: text("from_entity_classification")
    .notNull()
    .references(() => classification.id),
  grade: text("grade"),
  isRedoOrMissingUpload: boolean("is_redo_or_missing_upload").notNull().default(false),
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
  canUploadSchoolTest: boolean("can_upload_school_test").notNull().default(false),
  canUploadStudentInfo: boolean("can_upload_student_info").notNull().default(false),
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

// TODO: return prev generated test reports if data are same?
export const fitnessTest = pgTable("fitness_test", {
  // one per whole school
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  schoolId: text("school_id")
    .notNull()
    .references(() => school.id),
  name: text("name").notNull().unique(),
  fitnessTestDate: timestamp("fitness_test_date", {
    mode: "date",
    precision: 3,
    withTimezone: true,
  }).notNull(),
  mainUploadYearsAndClassesScoresGrades: jsonb("main_upload_years_and_classes_scores_grades")
    .$type<Record<string, Record<string, string[]>>>() // [avgScore, avgGrade, passingRate]
    .default({})
    .notNull(),
  redoOrMissingUploadYearsAndClassesScoresGrades: jsonb(
    "redo_or_missing_upload_years_and_classes_scores_grades"
  )
    .$type<Record<string, Record<string, string[]>>>()
    .default({})
    .notNull(),
  mainUploadYearsAndClassesProcessed: jsonb("main_upload_years_and_classes_processed")
    .$type<Record<string, string[]>>()
    .default({})
    .notNull(),
  redoOrMissingUploadYearsAndClassesProcessed: jsonb(
    "redo_or_missing_upload_years_and_classes_processed"
  )
    .$type<Record<string, string[]>>()
    .default({})
    .notNull(),
});

export const fileProcess = pgTable("file_process", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fileRequestNature: fileRequestNatureEnum("file_request_nature").notNull(),
  isUploadRequested: boolean("is_upload_requested").notNull().default(false),
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
  requestedByEntityId: text("requested_by_entity_id")
    .notNull()
    .references(() => entity.id),
  originalFileName: text("original_file_name"),
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
