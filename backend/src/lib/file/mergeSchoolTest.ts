import { readSchoolTestExcel, writeSchoolTestExcel } from "@/lib/excelOperations";
import { unlink } from "node:fs/promises";
import Path from "path";
export const mergeSchoolTestFromUpload = async (
  originalTestFilePath: string,
  originalTestFileName: string,
  newRecords: string[][],
  headers: string[]
) => {
  const originalFileLocation = Path.join(originalTestFilePath, originalTestFileName);
  const originalTestFile = Bun.file(originalFileLocation);
  const exists = await originalTestFile.exists();
  if (!exists) {
    // directly write to path
    await writeSchoolTestExcel([headers, ...newRecords], originalFileLocation);
    return;
  }
  const originalTestData = (await readSchoolTestExcel(originalTestFile)) as string[][];
  const mergedTestData = [...originalTestData, ...newRecords];
  const copyLocation = Path.join(originalTestFilePath, "copy - " + originalTestFileName);
  await Bun.write(copyLocation, originalTestFile);

  try {
    await writeSchoolTestExcel(mergedTestData, originalFileLocation);
  } catch (error) {
    console.error("Error merging school test: ", error);
    // restore original file from copy
    await Bun.write(originalFileLocation, Bun.file(copyLocation));
  } finally {
    try {
      await unlink(copyLocation);
    } catch (error) {
      // File might not exist, ignore error
      console.warn("Could not delete temporary file:", copyLocation);
    }
  }
};
