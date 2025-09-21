export type SessionContent = {
  entityId: string;
  classificationId: string;
  schoolName: string;
  schoolType: string;
  year: string | null;
  class: string | null;
  classNumber: string | null;
  name: string;
  isChildOf: string | null;
  gender: string;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  internalId: string | null;
  birthDate: Date | null;
  entityTypeId: string;
  entityType: string;
  createdAt: Date;
  updatedAt: Date;
  username: string | null;
  isExpired: boolean;
};

export interface AppBindings {
  Variables: {
    session: {
      activeClassifications: SessionContent[];
      allClassifications: SessionContent[];
    } | null;
    // parsedQueryParams: Record<string, string | string[]> & {
    //   page?: string;
    //   sortBy?: string;
    //   sortOrder?: "asc" | "desc";
    //   validFromYear?: string;
    //   validToYear?: string;
    // };
    permissionManager: {
      queryableClassificationIds: string[];
      modifyableClassificationIds: string[];
    };
  };
}
