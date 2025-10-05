import { EntityType } from "@/db/schema/enum";

export type SessionContent = {
  entityId: string;
  classificationId: string;
  schoolId: string;
  schoolName: string;
  schoolType: string;
  year: string | null;
  class: string | null;
  // classNumber: string | null;
  name: string;
  isChildOf: string | null;
  gender: string;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  internalId: string;
  birthDate: Date | null;
  entityType: EntityType;
  createdAt: Date;
  updatedAt: Date;
  username: string | null;
  validFrom: Date;
  validTo: Date | null;
  canAccessSchoolInClassification: boolean;
  canAccessClassInClassification: boolean;
  canAccessYearInClassification: boolean;
  canAccessSameEntityInternalIdInClassification: boolean;
  canAccessChildEntityInternalIdInClassification: boolean;
  canUploadSchoolTest: boolean;
  canUploadStudentInfo: boolean;
  children: { entityId: string; name: string }[];
};

export type Session = {
  activeClassifications: SessionContent[];
  allClassifications: SessionContent[];
};

export interface AppBindings {
  Variables: {
    session: Session | null;
    // parsedQueryParams: Record<string, string | string[]> & {
    //   page?: string;
    //   sortBy?: string;
    //   sortOrder?: "asc" | "desc";
    //   classificationValidFromYear?: string;
    //   classificationValidToYear?: string;
    // };
    permissionManager: {
      queryableClassificationIds: string[];
      modifyableClassificationIds: string[];
    };
  };
}
