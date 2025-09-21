import { sql } from "drizzle-orm";
import { AnyPgColumn, boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

const entityTypeEnum = pgEnum("name", ["student", "teacher", "parent", "admin"]);
const entityTypeEnumSchema = z.enum(entityTypeEnum.enumValues);

export const entityType = pgTable("entity_type", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: entityTypeEnum("name").notNull(),
});

export type EntityType = z.infer<typeof entityTypeEnumSchema>;

export const entity = pgTable("entity", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"), // unused, use name instead
  entityTypeId: text("entity_type_id")
    .notNull()
    .references(() => entityType.id),
  isChildOf: text("is_child_of").references((): AnyPgColumn => entity.id),
  internalId: text("internal_id"), // does not need to be unique, since student promoting will have same student id
  birthDate: timestamp("birth_date"),
  phoneNumber: text("phone_number").unique(), // students have their own accounts, but log in through parents, hence students themselves shouldnt have a verified phone number, so all phone numbers should be unique
  phoneNumberVerified: boolean("phone_number_verified").default(false).notNull(),
  gender: text("gender").notNull(),
});

export const session = pgTable("session", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => entity.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => entity.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
