import { db } from "@/db";
import { classification, classificationMap, entity, permission } from "@/db/schema";
import { AppBindings } from "@/lib/types";
import { and, eq } from "drizzle-orm";
import { MiddlewareHandler } from "hono";

//FLOW:
// 1. before controller, we populate context with queryable entity ids
// 2. for batch requests, i.e. get by searching, we will filter the result in controller
// TODO: cache the entity id an entity can access, separate read & write if needed

const withQueryableId: MiddlewareHandler<AppBindings> = async (c, next) => {
  // EXPECTS WITHSESSION MIDDLEWARE BEFORE THIS
  // all classifications should have same entity id and names
  const session = c.get("session");
  if (!session || session.allClassifications.length === 0) {
    // TODO: customize error class
    throw new Error("Unauthorized");
  }

  const permissionManager: AppBindings["Variables"]["permissionManager"] = {
    queryableClassificationIds: [],
    modifyableClassificationIds: [],
  };

  const permissions = (
    await db
      .select()
      .from(permission)
      .where(eq(permission.entityId, session.allClassifications[0].entityId))
      .limit(1)
  )[0];

  if (!permissions) {
    // TODO: customize error class
    console.error("Unauthorized, no permissions found", { permissions });
    throw new Error("Unauthorized");
  }

  if (permissions.canAccessSameEntityNameInClassification) {
    // students
    // all classifications should have same entity id and names
    // do not care active or not as student should be able to access all records for themselves
    // in: all classification
    // out (queryable): all classifications with same name
    const queryableClassificationIds = await db
      .select({ classificationId: classification.id })
      .from(classification)
      .where(
        and(
          eq(classification.schoolName, session.allClassifications[0].schoolName),
          eq(classification.schoolType, session.allClassifications[0].schoolType),
          eq(entity.name, session.allClassifications[0].name)
        )
      )
      .leftJoin(entity, eq(classification.entityId, entity.id));
    permissionManager.queryableClassificationIds.push(
      ...queryableClassificationIds.map((classification) => classification.classificationId)
    );
  } else if (permissions.canAccessChildEntityNameInClassification) {
    // parent
    // get all children (assuming in same school now, if parents have children across school, use a new account), then access by entity name
    // should just have one single classification
    // in: all classification
    // out (queryable): all classifications with same children names
    const childEntity = db
      .select()
      .from(entity)
      .where(eq(entity.isChildOf, session.allClassifications[0].entityId))
      .as("childEntity");
    const queryableClassificationIds = await db
      .select({ classificationId: classification.id })
      .from(classification)
      .leftJoin(childEntity, eq(classification.entityId, childEntity.id));
    permissionManager.queryableClassificationIds.push(
      ...queryableClassificationIds.map((classification) => classification.classificationId)
    );
  } else if (permissions.canAccessSchoolInClassification) {
    // principals or someone who has access to all records in same school (school name + type)
    // need active classifications
    // in: active classification
    // out (queryable): all classifications with same school name and type
    for (let i = 0; i < session.activeClassifications.length; i++) {
      const queryableClassificationIds = await db
        .select({ classificationId: classification.id })
        .from(classification)
        .where(
          and(
            eq(classification.schoolName, session.activeClassifications[i].schoolName),
            eq(classification.schoolType, session.activeClassifications[i].schoolType)
          )
        );
      permissionManager.queryableClassificationIds.push(
        ...queryableClassificationIds.map((classification) => classification.classificationId)
      );
    }
  } else if (permissions.canAccessYearInClassification) {
    // teachers responsible for whole year
    // in: active classification
    // out (queryable): all classifications with same year
    for (let i = 0; i < session.activeClassifications.length; i++) {
      const queryableClassificationIds = await db
        .select({ classificationId: classification.id })
        .from(classification)
        .where(
          and(
            eq(classification.schoolName, session.activeClassifications[i].schoolName),
            eq(classification.schoolType, session.activeClassifications[i].schoolType),
            eq(classificationMap.year, session.activeClassifications[i].year!)
          )
        )
        .leftJoin(classificationMap, eq(classification.id, classificationMap.classificationId));
      permissionManager.queryableClassificationIds.push(
        ...queryableClassificationIds.map((classification) => classification.classificationId)
      );
    }
  } else if (permissions.canAccessClassInClassification) {
    // teachers responsible for whole class
    // in: active classification
    // out (queryable): all classifications with same year and class
    for (let i = 0; i < session.activeClassifications.length; i++) {
      const queryableClassificationIds = await db
        .select({ classificationId: classification.id })
        .from(classification)
        .where(
          and(
            eq(classification.schoolName, session.activeClassifications[i].schoolName),
            eq(classification.schoolType, session.activeClassifications[i].schoolType),
            eq(classificationMap.year, session.activeClassifications[i].year!),
            eq(classificationMap.class, session.activeClassifications[i].class!)
          )
        )
        .leftJoin(classificationMap, eq(classification.id, classificationMap.classificationId));
      permissionManager.queryableClassificationIds.push(
        ...queryableClassificationIds.map((classification) => classification.classificationId)
      );
    }
  }

  permissionManager.queryableClassificationIds.push(
    ...session.activeClassifications.map((classification) => classification.classificationId)
  );

  permissionManager.queryableClassificationIds = [
    ...new Set(permissionManager.queryableClassificationIds),
  ];

  c.set("permissionManager", permissionManager);
  console.log("Queryable classification ids", permissionManager.queryableClassificationIds);

  return next();
};

export default withQueryableId;
