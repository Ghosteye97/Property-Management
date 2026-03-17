import { Router } from "express";
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
  const [doc] = await db.insert(documentsTable).values({ ...body, complexId }).returning();
  res.status(201).json(doc);
});

router.delete("/:documentId", async (req, res) => {
  const { complexId, documentId } = DeleteDocumentParams.parse(req.params);
  await db.delete(documentsTable).where(and(eq(documentsTable.complexId, complexId), eq(documentsTable.id, documentId)));
  res.status(204).send();
});

export default router;
