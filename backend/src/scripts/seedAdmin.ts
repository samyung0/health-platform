import { db } from "@/db";
import { classification, classificationMap, permission, school } from "@/db/schema";
import { auth } from "@/lib/auth";

async function main() {
  const [school_] = await db
    .insert(school)
    .values({
      name: "平谷区第十一小学",
      schoolType: "小学",
    })
    .onConflictDoNothing()
    .returning();
  const admin = await auth.api.signUpEmail({
    body: {
      email: "admin@admin.com",
      name: "Admin",
      password: "admin123",
      username: "admin",
      entityType: "admin",
      internalId: "admin",
      gender: "男",
    },
  });
  await db.insert(permission).values({
    entityId: admin.user.id,
    canAccessSchoolInClassification: true,
    canAccessClassInClassification: true,
    canAccessYearInClassification: true,
    canAccessSameEntityInternalIdInClassification: true,
    canAccessChildEntityInternalIdInClassification: true,
  });
  const [classification_] = await db
    .insert(classification)
    .values({
      entityId: admin.user.id,
      schoolId: school_.id,
      validFrom: new Date(1990, 1, 1),
      validTo: null,
    })
    .returning();
  await db.insert(classificationMap).values({
    classificationId: classification_.id,
  });

  console.log("Admin created: ", admin);
}

main();
