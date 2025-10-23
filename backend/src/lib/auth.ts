import { db } from "@/db";
import * as schema from "@/db/schema";
import { Session } from "@/lib/types";
import { checkValidClassification } from "@/lib/util";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  createAuthMiddleware,
  customSession,
  openAPI,
  phoneNumber,
  username,
} from "better-auth/plugins";
import { and, eq, sql } from "drizzle-orm";
import { v7 } from "uuid";

export const auth = betterAuth({
  trustedOrigins: [process.env.FRONTEND_URL!],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.entity,
    },
  }),
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
      },
      gender: {
        type: "string",
        required: true,
      },
      entityType: {
        type: "string",
        required: true,
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
      internalId: {
        type: "string",
        required: true,
      },
    },
  },
  plugins: [
    username(),
    phoneNumber({
      sendOTP: ({ phoneNumber, code }, request) => {
        // Implement sending OTP code via SMS
      },
    }),
    customSession(async ({ user, session }) => {
      const sessionData = await db
        .select({
          entityId: schema.entity.id,
          classificationId: schema.classification.id,
          schoolId: schema.classification.schoolId,
          schoolName: schema.school.name,
          schoolType: schema.school.schoolType,
          year: schema.classificationMap.year,
          class: schema.classificationMap.class,
          // classNumber: schema.classificationMap.classNumber,
          name: schema.entity.name,
          isChildOf: schema.entity.isChildOf,
          gender: schema.entity.gender,
          phoneNumber: schema.entity.phoneNumber,
          phoneNumberVerified: schema.entity.phoneNumberVerified,
          internalId: schema.entity.internalId,
          birthDate: schema.entity.birthDate,
          entityType: schema.entity.entityType,
          createdAt: schema.entity.createdAt,
          updatedAt: schema.entity.updatedAt,
          username: schema.entity.username,
          validFrom: schema.classification.validFrom,
          validTo: schema.classification.validTo,
          canUploadSchoolTest: schema.permission.canUploadSchoolTest,
          canUploadStudentInfo: schema.permission.canUploadStudentInfo,
          canAccessSchoolInClassification: schema.permission.canAccessSchoolInClassification,
          canAccessClassInClassification: schema.permission.canAccessClassInClassification,
          canAccessYearInClassification: schema.permission.canAccessYearInClassification,
          canAccessSameEntityInternalIdInClassification:
            schema.permission.canAccessSameEntityInternalIdInClassification,
          canAccessChildEntityInternalIdInClassification:
            schema.permission.canAccessChildEntityInternalIdInClassification,
          children: sql<Array<{ entityId: string; name: string }>>`json_build_array()`.as(
            "children"
          ),
        })
        .from(schema.classification)
        .where(and(eq(schema.classification.entityId, user.id)))
        .innerJoin(
          schema.classificationMap,
          eq(schema.classification.id, schema.classificationMap.classificationId)
        )
        .innerJoin(schema.entity, eq(schema.classification.entityId, schema.entity.id))
        .innerJoin(schema.school, eq(schema.classification.schoolId, schema.school.id))
        .innerJoin(
          schema.permission,
          eq(schema.classification.entityId, schema.permission.entityId)
        );
      if (sessionData.length === 0) throw new Error("Unauthorized");
      if (sessionData[0].entityType === "parent") {
        // find children
        const children = await db
          .select({
            entityId: schema.entity.id,
            name: schema.entity.name,
          })
          .from(schema.entity)
          .where(eq(schema.entity.isChildOf, sessionData[0].entityId));
        sessionData[0].children = children;
      }
      return {
        activeClassifications: JSON.parse(
          JSON.stringify(
            sessionData.filter((classification) => checkValidClassification(classification))
          )
        ),
        allClassifications: sessionData,
      } as Session;
    }),
    openAPI(),
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-in") && ctx.context.newSession) {
        // should have classification & permission record
        const classifications = await db
          .select()
          .from(schema.classification)
          .where(eq(schema.classification.entityId, ctx.context.newSession?.user.id))
          .innerJoin(
            schema.classificationMap,
            eq(schema.classification.id, schema.classificationMap.classificationId)
          )
          .limit(1);
        const permissions = await db
          .select()
          .from(schema.permission)
          .where(eq(schema.permission.entityId, ctx.context.newSession?.user.id))
          .limit(1);
        if (classifications.length === 0 || permissions.length === 0) {
          await db
            .delete(schema.session)
            .where(eq(schema.session.userId, ctx.context.newSession?.user.id));
          console.error("Unauthorized, no classifications or permissions found", {
            classifications,
            permissions,
          });
          return ctx.error("UNAUTHORIZED");
        }
      }
    }),
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 15 * 60, // Cache duration in seconds
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    password: {
      hash: async (password) => {
        return await Bun.password.hash(password, {
          algorithm: "bcrypt",
          cost: 10,
        });
      },
      verify: async ({ password, hash }) => {
        return await Bun.password.verify(password, hash);
      },
    },
  },
  advanced: {
    database: {
      generateId: () => v7(),
    },
  },
});

export type Auth = typeof auth;
