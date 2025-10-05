import * as XLSX from "xlsx";

/* load 'fs' for readFile and writeFile support */
import * as fs from "fs";
XLSX.set_fs(fs);

/* load 'stream' for stream support */
import { Readable } from "stream";
XLSX.stream.set_readable(Readable);

/* load the codepage support library for extended support with older formats  */
import * as cpexcel from "xlsx/dist/cpexcel.full.mjs";
XLSX.set_cptable(cpexcel);

export async function readSchoolTestExcel(file: File | Bun.BunFile) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw_data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  return raw_data;
}

export async function writeSchoolTestExcel(data: string[][], filePath: string) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "成绩导出");
  const fileData = XLSX.write(workbook, { compression: true, type: "array", bookType: "xlsx" });
  await Bun.write(filePath, fileData);
}

export async function createWorkbookFromJson(
  data: Record<string, any>[],
  sheetName: string,
  additionalFormats?: Record<
    string,
    {
      z?: string;
      t?: XLSX.ExcelDataType;
    }
  >
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, {
    dense: true,
  });
  if (additionalFormats) {
    for (const [key, value] of Object.entries(additionalFormats)) {
      for (const row of worksheet["!data"]!) {
        if (!row[parseInt(key)]) continue;
        if (value.z) {
          row[parseInt(key)].z = value.z;
        }
        if (value.t) {
          row[parseInt(key)].t = value.t;
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileData = XLSX.write(workbook, {
    compression: true,
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return fileData;
}
