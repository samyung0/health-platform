// /**
//  * Pagination Query Builder for Drizzle ORM
//  *
//  * This module provides a dynamic pagination query builder that can work with any Drizzle table schema.
//  * It automatically infers field types and names from the schema and provides the following query capabilities:
//  *
//  * Static parameters (available for all tables):
//  * - page: Page number (default: 1)
//  * - sortBy: Field name to sort by (default: 'createdAt')
//  * - sortOrder: 'asc' or 'desc' (default: 'desc')
//  *
//  * Dynamic parameters (automatically inferred from table schema):
//  * - For each field in the schema: exact match queries (single value or comma-separated list)
//  * - For numeric/date fields ONLY: range queries using fieldMin and fieldMax
//  * - string/boolean fields do NOT get range variants (TypeScript will show errors for idMin/idMax on string fields)
//  *
//  * Example usage:
//  * ```typescript
//  * // For any Drizzle table schema - types are automatically inferred
//  * const queryBuilder = createPaginationQueryBuilder(record);
//  * const queryBuilder2 = createPaginationQueryBuilder(measureType);
//  * const queryBuilder3 = createPaginationQueryBuilder(entity);
//  *
//  * // Query examples (field names are inferred from schema):
//  * // For record table: ?page=1&sortBy=score&sortOrder=asc&id=record1,record2&scoreMin=10&scoreMax=100
//  * // For measureType table: ?page=1&sortBy=name&name=exercise1,exercise2&isExercise=true
//  * const queryResult = queryBuilder.buildQuery(queryParams);
//  *
//  * // Execute the queries manually:
//  * const records: InferSelectModel<typeof record>[] = await queryResult.query;
//  * const totalCountResult: { count: number }[] = await queryResult.countQuery;
//  * const total = totalCountResult[0]?.count || 0;
//  * const totalPages = Math.ceil(total / queryResult.limit);
//  *
//  * // Result structure:
//  * // {
//  * //   data: [...], // Array of records
//  * //   total: 150,  // Total number of records matching the query
//  * //   totalPages: 3 // Total number of pages
//  * // }
//  * ```
//  */
// import { db } from "@/db";
// import { classification } from "@/db/schema/main";
// import {
//   and,
//   asc,
//   between,
//   count,
//   desc,
//   eq,
//   getTableColumns,
//   gt,
//   gte,
//   inArray,
//   InferSelectModel,
//   lte,
//   SQLWrapper,
// } from "drizzle-orm";
// import { AnyPgColumn, PgColumn, PgSelect, PgTable } from "drizzle-orm/pg-core";
// import { v4 } from "uuid";
// import { DEFAULT_OUTDATED_DAY, DEFAULT_OUTDATED_MONTH, PAGE_SIZE } from "./const";

// // Type utilities to extract field information from Drizzle schemas
// // Using Drizzle's actual type system to infer column names
// type ExtractColumnNames<T> = T extends { _: { columns: infer Columns } }
//   ? Columns extends Record<infer K, any>
//     ? K extends string
//       ? K
//       : never
//     : never
//   : never;

// // Type utility to check if a field is numeric or date (eligible for range queries)
// // Using Drizzle's actual column structure to detect field types
// type IsRangeField<T, K extends string> = T extends { _: { columns: infer Columns } }
//   ? Columns extends Record<K, infer Column>
//     ? Column extends { _: { dataType: "number" } }
//       ? true
//       : Column extends { _: { dataType: "date" } }
//       ? true
//       : Column extends { _: { dataType: "string" } }
//       ? false
//       : Column extends { _: { dataType: "boolean" } }
//       ? false
//       : Column extends { dataType: "number" }
//       ? true
//       : Column extends { dataType: "date" }
//       ? true
//       : Column extends { dataType: "string" }
//       ? false
//       : Column extends { dataType: "boolean" }
//       ? false
//       : false
//     : false
//   : false;

// // Field type categorization
// type FieldType = "string" | "number" | "boolean" | "date" | "unknown";

// // Base query parameters that are always available
// interface BaseQueryParams {
//   sortBy?: string;
//   sortOrder?: "asc" | "desc";
//   classificationValidFromYear?: string;
//   classificationValidToYear?: string;
// }

// // Dynamic query parameters inferred from schema columns
// type DynamicQueryParams<T> = {
//   [K in ExtractColumnNames<T>]?: readonly string[];
// } & {
//   [K in ExtractColumnNames<T> as IsRangeField<T, K> extends true ? `${K}Min` : never]?: string;
// } & {
//   [K in ExtractColumnNames<T> as IsRangeField<T, K> extends true ? `${K}Max` : never]?: string;
// };

// // Complete query parameters type with proper field inference
// export type QueryParams<T> = BaseQueryParams & DynamicQueryParams<T>;
// export type PaginationQueryParams<T> = QueryParams<T> & {
//   page: string;
// };

// // Query builder result - returns the actual Drizzle query promises with proper typing
// export interface QueryBuilderResult<TTable extends PgTable> {
//   // Main query promise - using the actual Drizzle query type
//   query: Promise<InferSelectModel<TTable>[]>;
// }

// // Configuration for the query builder
// export interface QueryBuilderConfig {
//   pageSize?: number;
//   defaultSortField?: string;
//   defaultSortOrder?: "asc" | "desc";
// }

// // Field type mapping for PostgreSQL columns
// const getFieldType = (column: AnyPgColumn): FieldType => {
//   const dataType = column.dataType;
//   if (["number", "string", "boolean", "date"].includes(dataType)) {
//     return dataType as FieldType;
//   }

//   return "unknown";
// };

// // Convert string value to appropriate type based on field type
// const convertValue = (value: string, fieldType: FieldType): any => {
//   switch (fieldType) {
//     case "number":
//       return parseFloat(value);
//     case "boolean":
//       return value.toLowerCase() === "true";
//     case "date":
//       return new Date(value);
//     case "string":
//     default:
//       return value;
//   }
// };

// const filtersBuilder = <TTable extends PgTable>(
//   columns: Record<string, AnyPgColumn>,
//   queryParams: PaginationQueryParams<TTable> | QueryParams<TTable>
// ) => {
//   const filters: SQLWrapper[] = [];

//   // Process each field dynamically
//   for (const [queryParamName, queryParamValue] of Object.entries(queryParams)) {
//     if (
//       queryParamName === "page" ||
//       queryParamName === "sortBy" ||
//       queryParamName === "sortOrder"
//     ) {
//       continue;
//     }
//     const isRange = queryParamName.includes("Min") || queryParamName.includes("Max");
//     const fieldName = isRange ? queryParamName.slice(0, -3) : queryParamName;
//     const paramValue = queryParamValue as string | readonly string[] | undefined;

//     if (!paramValue || paramValue.length === 0 || paramValue[0] === "" || paramValue === "") {
//       throw new Error(`Query param value for '${queryParamName}' is required`);
//     }

//     if (queryParamName === "classificationValidFromYear" || queryParamName === "classificationValidToYear") {
//       if (Array.isArray(paramValue)) {
//         // TODO: custom errors
//         throw new Error(`Valid from and to year query params should not be an array`);
//       }

//       filters.push(
//         queryParamName === "classificationValidFromYear"
//           ? gt(
//               classification.validTo,
//               new Date(parseInt(paramValue as string), DEFAULT_OUTDATED_MONTH, DEFAULT_OUTDATED_DAY)
//             )
//           : lte(
//               classification.validTo,
//               new Date(parseInt(paramValue as string), DEFAULT_OUTDATED_MONTH, DEFAULT_OUTDATED_DAY)
//             )
//       );

//       continue;
//     }

//     const column = columns[fieldName];
//     if (!column) {
//       throw new Error(`Column '${queryParamName}' not found in table schema`);
//     }

//     const fieldType = getFieldType(column);

//     if (!isRange) {
//       if (Array.isArray(paramValue) && paramValue.length > 0) {
//         const convertedValues = paramValue.map((v) => convertValue(v, fieldType));
//         filters.push(inArray(column, convertedValues));
//       } else {
//         const convertedValue = convertValue(
//           Array.isArray(paramValue) ? paramValue[0] : paramValue,
//           fieldType
//         );
//         filters.push(eq(column, convertedValue));
//       }
//     } else {
//       if (fieldType !== "number" && fieldType !== "date") {
//         throw new Error(`Range queries are only supported for numeric and date fields`);
//       }
//       const minParam = queryParams[`${fieldName}Min` as keyof PaginationQueryParams<TTable>] as
//         | string
//         | undefined;
//       const maxParam = queryParams[`${fieldName}Max` as keyof PaginationQueryParams<TTable>] as
//         | string
//         | undefined;

//       if (minParam || maxParam) {
//         const minValue = minParam ? convertValue(minParam, fieldType) : undefined;
//         const maxValue = maxParam ? convertValue(maxParam, fieldType) : undefined;

//         if (minValue !== undefined && maxValue !== undefined) {
//           filters.push(between(column, minValue, maxValue));
//         } else if (minValue !== undefined) {
//           filters.push(gte(column, minValue));
//         } else if (maxValue !== undefined) {
//           filters.push(lte(column, maxValue));
//         }
//       }
//     }
//   }

//   return filters;
// };

// // Main pagination query builder function - builds queries and retuning promise
// function buildPaginatedQuery<TTable extends PgTable>(
//   table: TTable,
//   queryParams: PaginationQueryParams<TTable>,
//   config: QueryBuilderConfig = {},
//   classificationColumn?: PgColumn
// ) {
//   const { pageSize = PAGE_SIZE, defaultSortField, defaultSortOrder } = config;

//   // Parse pagination parameters
//   const page = parseInt(queryParams.page);
//   const offset = (page - 1) * pageSize;
//   const sortBy = queryParams.sortBy || defaultSortField;
//   const sortOrder = queryParams.sortOrder || defaultSortOrder;
//   const columns = getTableColumns(table);

//   let mainQuery: PgSelect = db.select().from(table).$dynamic();

//   const filters = filtersBuilder(columns, queryParams);
//   mainQuery = mainQuery.where(and(...filters));

//   const countQuery = db
//     .select({ count: count() })
//     // @ts-ignore
//     .from(mainQuery.config.table);

//   if (classificationColumn) {
//     mainQuery = mainQuery.leftJoin(classification, eq(classificationColumn, classification.id));
//   }

//   if (sortBy) {
//     const sortColumn = columns[sortBy];
//     if (!sortColumn) {
//       throw new Error(`Sort column '${sortBy}' not found in table schema`);
//     }
//     mainQuery = mainQuery.orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn));
//   }

//   mainQuery = mainQuery.limit(pageSize).offset(offset);

//   console.log(mainQuery.toSQL());

//   // Return the query promises with proper typing
//   return {
//     query: mainQuery.prepare(v4()),
//     countQuery: countQuery.prepare(v4()),
//     pageSize,
//     offset,
//   };
// }

// // Main query builder function - builds queries and retuning promise
// function buildQuery<TTable extends PgTable>(
//   table: TTable,
//   queryParams: QueryParams<TTable>,
//   config: QueryBuilderConfig = {},
//   classificationColumn?: PgColumn
// ) {
//   const { defaultSortField, defaultSortOrder } = config;

//   // Parse pagination parameters
//   const sortBy = queryParams.sortBy || defaultSortField;
//   const sortOrder = queryParams.sortOrder || defaultSortOrder;

//   // Get table columns - using a more direct approach
//   const columns = getTableColumns(table);

//   let mainQuery: PgSelect = db.select().from(table).$dynamic();
//   const filters = filtersBuilder(columns, queryParams);

//   mainQuery = mainQuery.where(and(...filters));

//   if (classificationColumn) {
//     mainQuery = mainQuery.leftJoin(classification, eq(classificationColumn, classification.id));
//   }

//   if (sortBy) {
//     const sortColumn = columns[sortBy];
//     if (!sortColumn) {
//       throw new Error(`Sort column '${sortBy}' not found in table schema`);
//     }
//     mainQuery = mainQuery.orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn));
//   }

//   // Return the query promises with proper typing
//   return mainQuery.prepare(v4());
// }

// // Type-safe query builder factory
// export function createQueryBuilder<TTable extends PgTable>(
//   table: TTable,
//   classificationColumn?: PgColumn,
//   config?: QueryBuilderConfig
// ) {
//   return {
//     buildPaginationQuery(queryParams: PaginationQueryParams<TTable>) {
//       return buildPaginatedQuery(table, queryParams, config, classificationColumn);
//     },
//     buildQuery(queryParams: QueryParams<TTable>) {
//       return buildQuery(table, queryParams, config, classificationColumn);
//     },
//   };
// }
