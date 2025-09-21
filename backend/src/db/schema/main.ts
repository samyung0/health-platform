import { entity } from "@/db/schema/auth";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const measureType = pgTable("measure_type", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull(),
  isExercise: boolean("is_exercise").notNull().default(false),
});

export const recordNatureEnum = pgEnum("name", ["exercise", "test"]);
const recordNatureEnumSchema = z.enum(recordNatureEnum.enumValues);

export type RecordNature = z.infer<typeof recordNatureEnumSchema>;

export const recordNature = pgTable("record_nature", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  inSchool: boolean("in_school").notNull().default(false),
  name: recordNatureEnum("name").notNull(),
});

export const record = pgTable("record", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  measureTypeId: text("measure_type_id")
    .notNull()
    .references(() => measureType.id),
  recordNatureId: text("record_nature_id")
    .notNull()
    .references(() => recordNature.id),
  fitnessTestId: text("fitness_test_id").references(() => fitnessTest.id),
  score: real("score").notNull(),
  videoUrl: text("video_url"),
  toEntityClassification: text("to_entity_classification")
    .notNull()
    .references(() => classification.id),
  fromEntityClassification: text("from_entity_classification")
    .notNull()
    .references(() => classification.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const exerciseSchedule = pgTable("exercise_schedule", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => measureType.id),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
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
  schoolName: text("school_name").unique().notNull(),
  schoolType: text("school_type").unique().notNull(), //大学初高中小学
  entityId: text("entity_id")
    .notNull()
    .references(() => entity.id),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  isExpired: boolean("is_expired").notNull().default(false), // CAN ONLY HAVE 1 Not expierd per entity
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
  canAccessSameEntityNameInClassification: boolean("can_access_same_entity_name_in_classification")
    .notNull()
    .default(false),
  canAccessChildEntityNameInClassification: boolean(
    "can_access_child_entity_name_in_classification"
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
  classNumber: text("class_number"),
  classificationId: text("classification_id")
    .notNull()
    .references(() => classification.id),
});

export const generalClassification = pgTable("general_classification", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  schoolType: text("school_type").notNull(), //大学初高中小学
  year: text("year"),
});

export const grading = pgTable(
  "grading",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    measureTypeId: text("measure_type_id")
      .notNull()
      .references(() => measureType.id),
    generalClassificationId: text("general_classification_id")
      .notNull()
      .references(() => generalClassification.id),
    gender: text("gender").notNull(),
    score: real("score"),
    scoreUpperRange: real("score_upper_range"),
    scoreLowerRange: real("score_lower_range"),
    normalizedScore: real("normalized_score").notNull(),
    grade: text("grade").notNull(),
  },
  (table) => [
    check("score_range", sql`score_upper_range > score_lower_range`),
    check(
      "either_score_or_score_range",
      sql`(score IS NOT NULL AND score_upper_range IS NULL AND score_lower_range IS NULL) OR (score IS NULL AND ( score_upper_range IS NOT NULL OR score_lower_range IS NOT NULL))`
    ),
  ]
);

export const fitnessTestCombinedGrading = pgTable("fitness_test_combined_grading", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  normalizedScoreGreaterThanOrEqualTo: real("normalized_score_greater_than_or_equal_to").notNull(),
  normalizedScoreLessThan: real("normalized_score_less_than").notNull(),
  name: text("name").notNull().unique(),
});

export const fitnessTestWeighting = pgTable(
  "fitness_test_weighting",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    measureTypeId: text("measure_type_id")
      .notNull()
      .references(() => measureType.id),
    generalClassificationId: text("general_classification_id")
      .notNull()
      .references(() => generalClassification.id),
    weighting: real("weighting").notNull(),
  },
  (table) => [
    uniqueIndex("unique_weighting").on(table.measureTypeId, table.generalClassificationId),
  ]
);

export const offsetConditionEnum = pgEnum("offset_condition", [
  "greater_than_max",
  "less_than_min",
]);
const offsetConditionEnumSchema = z.enum(offsetConditionEnum.enumValues);
export type OffsetCondition = z.infer<typeof offsetConditionEnumSchema>;

export const additionalScore = pgTable(
  "additional_score",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    measureTypeId: text("measure_type_id")
      .notNull()
      .references(() => measureType.id),
    generalClassificationId: text("general_classification_id")
      .notNull()
      .references(() => generalClassification.id),
    gender: text("gender"),
    offset: real("offset"),
    offsetCondition: offsetConditionEnum("offset_condition").notNull(),
    additionalScore: real("additional_score").notNull(),
  },
  (table) => [
    uniqueIndex("unique_additional_score").on(
      table.measureTypeId,
      table.generalClassificationId,
      table.gender,
      table.offset
    ),
  ]
);

export const fitnessTest = pgTable("fitness_test", {
  // one per whole school
  // TODO: add logic to generate results
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fitnessTestDate: timestamp("fitness_test_date").notNull(),
  filePath: text("file_path"),
  fileLastGenerationDate: timestamp("file_last_generation_date"),
});
