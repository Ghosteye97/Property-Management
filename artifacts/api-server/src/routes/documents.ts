import { Router } from "express";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListDocumentsParams,
  CreateDocumentParams,
  CreateDocumentBody,
  DeleteDocumentParams,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const documentUploadsDir = path.resolve(currentDir, "../../../../uploads/documents");

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted = size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

router.get("/", async (req, res) => {
  const { complexId } = ListDocumentsParams.parse(req.params);
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.complexId, complexId))
    .orderBy(documentsTable.uploadedAt);
  res.json(docs);
});

router.post("/", async (req, res) => {
  const { complexId } = CreateDocumentParams.parse(req.params);
  const body = CreateDocumentBody.parse(req.body);
  let fileUrl = body.fileUrl;
  let fileSize = body.fileSize;

  if (body.fileContentBase64 && body.fileName) {
    const safeFileName = sanitizeFileName(body.fileName);
    const extension = path.extname(safeFileName);
    const fileStem = path.basename(safeFileName, extension);
    const storedFileName = `${Date.now()}-${fileStem}${extension}`;
    const storedFilePath = path.join(documentUploadsDir, storedFileName);
    const fileBuffer = Buffer.from(body.fileContentBase64, "base64");

    await mkdir(documentUploadsDir, { recursive: true });
    await writeFile(storedFilePath, fileBuffer);

    fileUrl = `/api/uploads/documents/${storedFileName}`;
    fileSize = body.fileSize || formatFileSize(fileBuffer.byteLength);
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      complexId,
      unitId: body.unitId,
      name: body.name,
      category: body.category,
      sourceType: body.sourceType || "upload",
      fileName: body.fileName,
      mimeType: body.mimeType,
      formData: body.formData,
      fileUrl,
      fileSize,
    })
    .returning();
  res.status(201).json(doc);
});

router.delete("/:documentId", async (req, res) => {
  const { complexId, documentId } = DeleteDocumentParams.parse(req.params);
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.complexId, complexId), eq(documentsTable.id, documentId)));

  if (document?.fileUrl?.startsWith("/api/uploads/documents/")) {
    const storedFileName = document.fileUrl.replace("/api/uploads/documents/", "");
    const storedFilePath = path.join(documentUploadsDir, storedFileName);
    await unlink(storedFilePath).catch(() => undefined);
  }

  await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.complexId, complexId), eq(documentsTable.id, documentId)));
  res.status(204).send();
});

export default router;
