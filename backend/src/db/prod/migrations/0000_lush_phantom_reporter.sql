CREATE TYPE "public"."entity_type" AS ENUM('student', 'parent', 'classTeacher', 'formTeacher', 'schoolDirector', 'principal', 'admin');--> statement-breakpoint
CREATE TYPE "public"."exercise_name" AS ENUM('体重指数（BMI）', '50米跑', '坐位体前屈', '跳绳', '仰卧起坐', '50米×8往返跑', '立定跳远', '引体向上', '1000米跑', '800米跑');--> statement-breakpoint
CREATE TYPE "public"."file_process_message_severity" AS ENUM('error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."file_process_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."nature" AS ENUM('schoolTest', 'schoolExercise', 'studentInfo');--> statement-breakpoint
CREATE TYPE "public"."name" AS ENUM('exercise', 'test');--> statement-breakpoint
CREATE TYPE "public"."school_type" AS ENUM('大学', '初中', '高中', '小学');--> statement-breakpoint
CREATE TYPE "public"."test_name" AS ENUM('身高', '体重', '体重指数（BMI）', '肺活量', '50米跑', '坐位体前屈', '一分钟跳绳', '一分钟仰卧起坐', '50米×8往返跑', '立定跳远', '引体向上', '1000米跑', '800米跑');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"entity_type" "entity_type" NOT NULL,
	"is_child_of" text,
	"internal_id" text NOT NULL,
	"birth_date" timestamp,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false NOT NULL,
	"gender" text NOT NULL,
	CONSTRAINT "entity_email_unique" UNIQUE("email"),
	CONSTRAINT "entity_username_unique" UNIQUE("username"),
	CONSTRAINT "entity_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "school" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"school_type" "school_type" NOT NULL,
	CONSTRAINT "school_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis" text NOT NULL,
	"to_entity_classification" text NOT NULL,
	"from_entity_classification" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classification" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"valid_from" timestamp (3) with time zone NOT NULL,
	"valid_to" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "classification_map" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" text,
	"class" text,
	"classification_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_schedule" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_type" "exercise_name" NOT NULL,
	"frequency" smallint NOT NULL,
	"unit" text NOT NULL,
	"future_time_range_unit" text NOT NULL,
	"effective_start_date" timestamp NOT NULL,
	"effective_end_date" timestamp NOT NULL,
	"to_entity_classification" text NOT NULL,
	"from_entity_classification" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_process" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_request_nature" "nature" NOT NULL,
	"is_upload_requested" boolean DEFAULT false NOT NULL,
	"file_id" text,
	"requested_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"process_start_date" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"process_end_date" timestamp (3) with time zone,
	"status" "file_process_status" NOT NULL,
	"requested_by_entity_id" text NOT NULL,
	"original_file_name" text
);
--> statement-breakpoint
CREATE TABLE "file_process_message" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_process_id" text NOT NULL,
	"message" text NOT NULL,
	"severity" "file_process_message_severity" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_storage" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_path" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fitness_test" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"fitness_test_date" timestamp (3) with time zone NOT NULL,
	"main_upload_years_and_classes_scores_grades" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"redo_or_missing_upload_years_and_classes_scores_grades" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"main_upload_years_and_classes_processed" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"redo_or_missing_upload_years_and_classes_processed" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "fitness_test_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text NOT NULL,
	"can_access_school_in_classification" boolean DEFAULT false NOT NULL,
	"can_access_class_in_classification" boolean DEFAULT false NOT NULL,
	"can_access_year_in_classification" boolean DEFAULT false NOT NULL,
	"can_access_same_entity_internal_id_in_classification" boolean DEFAULT false NOT NULL,
	"can_access_child_entity_internal_id_in_classification" boolean DEFAULT false NOT NULL,
	"can_upload_school_test" boolean DEFAULT false NOT NULL,
	"can_upload_student_info" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_type" text NOT NULL,
	"in_school" boolean DEFAULT false NOT NULL,
	"nature" "name" NOT NULL,
	"fitness_test_id" text,
	"score" real,
	"exercise_score" real,
	"normalized_score" real,
	"additional_score" real,
	"exercise_duration" real,
	"exercise_date" timestamp (0),
	"video_url" text,
	"to_entity_classification" text NOT NULL,
	"from_entity_classification" text NOT NULL,
	"grade" text,
	"is_redo_or_missing_upload" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_entity_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity" ADD CONSTRAINT "entity_is_child_of_entity_id_fk" FOREIGN KEY ("is_child_of") REFERENCES "public"."entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_entity_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_to_entity_classification_classification_id_fk" FOREIGN KEY ("to_entity_classification") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_from_entity_classification_classification_id_fk" FOREIGN KEY ("from_entity_classification") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification" ADD CONSTRAINT "classification_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification" ADD CONSTRAINT "classification_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification_map" ADD CONSTRAINT "classification_map_classification_id_classification_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_schedule" ADD CONSTRAINT "exercise_schedule_to_entity_classification_classification_id_fk" FOREIGN KEY ("to_entity_classification") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_schedule" ADD CONSTRAINT "exercise_schedule_from_entity_classification_classification_id_fk" FOREIGN KEY ("from_entity_classification") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_process" ADD CONSTRAINT "file_process_file_id_file_storage_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_storage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_process" ADD CONSTRAINT "file_process_requested_by_entity_id_entity_id_fk" FOREIGN KEY ("requested_by_entity_id") REFERENCES "public"."entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_process_message" ADD CONSTRAINT "file_process_message_file_process_id_file_process_id_fk" FOREIGN KEY ("file_process_id") REFERENCES "public"."file_process"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitness_test" ADD CONSTRAINT "fitness_test_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_fitness_test_id_fitness_test_id_fk" FOREIGN KEY ("fitness_test_id") REFERENCES "public"."fitness_test"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_to_entity_classification_classification_id_fk" FOREIGN KEY ("to_entity_classification") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_from_entity_classification_classification_id_fk" FOREIGN KEY ("from_entity_classification") REFERENCES "public"."classification"("id") ON DELETE no action ON UPDATE no action;