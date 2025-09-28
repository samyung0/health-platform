import { db } from "@/db";
import { fileProcess, fileProcessMessage } from "@/db/schema";
import { DEFAULT_UPLOAD_FILE_PATH } from "@/lib/const";
import { createRouter } from "@/lib/create-app";
import { schoolStudentsUpload } from "@/lib/file/schoolStudentsUpload";
import { schoolTestUpload } from "@/lib/file/schoolTestUpload";
import { uploadSchoolTestValidator, uploadStudentInfoValidator } from "@/lib/validators";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import Path from "path";

const router = createRouter()
  .get("/fileProcess/:id", async (c) => {
    const id = c.req.param("id");
    const fileProcess_ = await db
      .select()
      .from(fileProcess)
      .where(eq(fileProcess.id, id))
      .leftJoin(fileProcessMessage, eq(fileProcess.id, fileProcessMessage.fileProcessId));
    return c.json({ data: fileProcess_ });
  })
  .post("/schoolTest/upload", zValidator("form", uploadSchoolTestValidator), async (c) => {
    const body = c.req.valid("form");
    const file = body.file;

    if (!c.get("session")) {
      throw new Error("Unauthorized");
    }

    // make copy
    const copyFilePath = Path.join(
      DEFAULT_UPLOAD_FILE_PATH,
      `体测-${body.testName}-${
        body.isRedoOrMissingUpload ? "重测" : "主测"
      }-${Date.now()}.${file.name.split(".").pop()}`
    );
    const copyLocation = Bun.file(copyFilePath);
    Bun.write(copyLocation, file);

    const processResult = await schoolTestUpload(body, file, copyFilePath, c.get("session")!);

    return c.json({ data: processResult });
  })
  .post("/studentInfo/upload", zValidator("form", uploadStudentInfoValidator), async (c) => {
    const body = c.req.valid("form");
    const file = body.file;

    if (!c.get("session")) {
      throw new Error("Unauthorized");
    }

    const copyFilePath = Path.join(
      DEFAULT_UPLOAD_FILE_PATH,
      `学生资料-${body.from}年-${body.to}年-${Date.now()}.${file.name.split(".").pop()}`
    );

    const copyLocation = Bun.file(copyFilePath);
    Bun.write(copyLocation, file);

    const processResult = await schoolStudentsUpload(body, file, copyFilePath, c.get("session")!);

    return c.json({ data: processResult });
  });

export default router;
