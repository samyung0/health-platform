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

  if (permissions.canAccessSameEntityInternalIdInClassification) {
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
          eq(classification.schoolId, session.allClassifications[0].schoolId),
          eq(entity.internalId, session.allClassifications[0].internalId)
        )
      )
      .innerJoin(entity, eq(classification.entityId, entity.id));
    permissionManager.queryableClassificationIds.push(
      ...queryableClassificationIds.map((classification) => classification.classificationId)
    );
  }

  if (permissions.canAccessChildEntityInternalIdInClassification) {
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
  }

  if (permissions.canAccessSchoolInClassification) {
    // principals or someone who has access to all records in same school (school name + type)
    // need active classifications
    // in: active classification
    // out (queryable): all classifications with same school name and type

    // same school throughout entity lifetime
    const queryableClassificationIds = await db
      .select({ classificationId: classification.id })
      .from(classification)
      .where(and(eq(classification.schoolId, session.activeClassifications[0].schoolId)));
    permissionManager.queryableClassificationIds.push(
      ...queryableClassificationIds.map((classification) => classification.classificationId)
    );
  }

  if (permissions.canAccessYearInClassification) {
    // teachers responsible for whole year
    // in: active classification
    // out (queryable): all classifications with same year

    // only this year, so to needs to be active and from needs to be active
    for (let i = 0; i < session.activeClassifications.length; i++) {
      if (!session.activeClassifications[0].year) continue;
      const queryableClassificationIds = await db
        .select({ classificationId: classification.id })
        .from(classification)
        .where(
          and(
            eq(classification.schoolId, session.allClassifications[i].schoolId),
            eq(classificationMap.year, session.allClassifications[i].year!)
          )
        )
        .leftJoin(classificationMap, eq(classification.id, classificationMap.classificationId));
      permissionManager.queryableClassificationIds.push(
        ...queryableClassificationIds.map((classification) => classification.classificationId)
      );
    }
  }

  if (permissions.canAccessClassInClassification) {
    // teachers responsible for whole class
    // in: active classification
    // out (queryable): all classifications with same year and class
    for (let i = 0; i < session.activeClassifications.length; i++) {
      if (!session.activeClassifications[0].year || !session.activeClassifications[0].class)
        continue;
      const queryableClassificationIds = await db
        .select({ classificationId: classification.id })
        .from(classification)
        .where(
          and(
            eq(classification.schoolId, session.activeClassifications[i].schoolId),
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

  // permissionManager.queryableClassificationIds.push(
  //   ...session.allClassifications.map((classification) => classification.classificationId)
  // );

  permissionManager.queryableClassificationIds = [
    ...new Set(permissionManager.queryableClassificationIds),
  ];

  c.set("permissionManager", permissionManager);

  return next();
};

export default withQueryableId;
