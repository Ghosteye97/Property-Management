import { Router } from "express";
import { db } from "@workspace/db";
import { communicationsTable, unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListCommunicationsParams,
  CreateCommunicationParams,
  CreateCommunicationBody,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { complexId } = ListCommunicationsParams.parse(req.params);
  const comms = await db
    .select()
    .from(communicationsTable)
    .where(eq(communicationsTable.complexId, complexId))
    .orderBy(communicationsTable.createdAt);
  res.json(comms);
});

router.post("/", async (req, res) => {
  const { complexId } = CreateCommunicationParams.parse(req.params);
  const body = CreateCommunicationBody.parse(req.body);

  let recipientCount = 0;
  if (body.sentTo === "All Units") {
    const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId));
    recipientCount = units.length;
  } else if (body.sentTo === "All Owners") {
    const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId));
    recipientCount = units.filter((unit) => Boolean(unit.ownerName || unit.ownerEmail)).length;
  } else if (body.sentTo === "Trustees") {
    const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId));
    recipientCount = units.filter((unit) => unit.isTrustee).length;
  } else if (body.unitIds && body.unitIds.length > 0) {
    recipientCount = body.unitIds.length;
  }

  const [comm] = await db
    .insert(communicationsTable)
    .values({
      complexId,
      subject: body.subject,
      body: body.body,
      type: body.type,
      sentTo: body.sentTo,
      recipientCount,
      sentAt: new Date(),
    })
    .returning();
  res.status(201).json(comm);
});

export default router;
