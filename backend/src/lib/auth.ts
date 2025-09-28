import { db } from "@/db";
import * as schema from "@/db/schema";
import { Session, SessionContent } from "@/lib/types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  createAuthMiddleware,
  customSession,
  openAPI,
  phoneNumber,
  username,
} from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const auth = betterAuth({
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
      const sessionData = (await db
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
        })
        .from(schema.classification)
        .where(and(eq(schema.classification.entityId, user.id)))
        .innerJoin(
          schema.classificationMap,
          eq(schema.classification.id, schema.classificationMap.classificationId)
        )
        .innerJoin(schema.entity, eq(schema.classification.entityId, schema.entity.id))
        .innerJoin(
          schema.school,
          eq(schema.classification.schoolId, schema.school.id)
        )) as SessionContent[];
      return {
        activeClassifications: sessionData.filter(
          (classification) =>
            !classification.validTo || Date.now() < classification.validTo.getTime()
        ),
        allClassifications: sessionData,
      } as Session;
    }),
    openAPI(),
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/username" && ctx.context.newSession) {
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
      generateId: () => uuidv4(),
    },
  },
});
