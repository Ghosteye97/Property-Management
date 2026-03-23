import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  emailAccountsTable,
  emailActivitiesTable,
  unitsTable,
} from "@workspace/db";

const router = Router({ mergeParams: true });

const paramsSchema = z.object({
  complexId: z.coerce.number(),
});

const createAccountSchema = z.object({
  provider: z.string().min(1),
  emailAddress: z.string().email(),
  displayName: z.string().optional(),
});

const createEmailActivitySchema = z.object({
  accountId: z.number().optional(),
  mailboxAddress: z.string().email().optional(),
  direction: z.enum(["Inbound", "Outbound"]),
  subject: z.string().min(1),
  bodyPreview: z.string().optional(),
  contactEmail: z.string().email(),
  participants: z.string().optional(),
  threadId: z.string().optional(),
  providerMessageId: z.string().optional(),
  isUnread: z.boolean().optional(),
  receivedAt: z.union([z.string(), z.date()]).optional(),
});

router.get("/", async (req, res) => {
  const { complexId } = paramsSchema.parse(req.params);

  const [accounts, activities, units] = await Promise.all([
    db
      .select()
      .from(emailAccountsTable)
      .where(eq(emailAccountsTable.complexId, complexId))
      .orderBy(desc(emailAccountsTable.connectedAt)),
    db
      .select()
      .from(emailActivitiesTable)
      .where(eq(emailActivitiesTable.complexId, complexId))
      .orderBy(desc(emailActivitiesTable.receivedAt), desc(emailActivitiesTable.createdAt)),
    db
      .select()
      .from(unitsTable)
      .where(eq(unitsTable.complexId, complexId)),
  ]);

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const decorate = (activity: (typeof activities)[number]) => {
    const unit = activity.unitId ? unitMap.get(activity.unitId) : undefined;
    return {
      ...activity,
      unitNumber: unit?.unitNumber,
      ownerName: unit?.ownerName,
      tenantName: unit?.tenantName,
    };
  };

  return res.json({
    accounts,
    matched: activities
      .filter((activity) => activity.matchedStatus === "matched")
      .map(decorate),
    unmatched: activities
      .filter((activity) => activity.matchedStatus === "unmatched")
      .map(decorate),
  });
});

router.post("/accounts", async (req, res) => {
  const { complexId } = paramsSchema.parse(req.params);
  const body = createAccountSchema.parse(req.body);

  const [account] = await db
    .insert(emailAccountsTable)
    .values({
      complexId,
      provider: body.provider,
      emailAddress: body.emailAddress.toLowerCase(),
      displayName: body.displayName,
    })
    .returning();

  return res.status(201).json(account);
});

router.post("/emails", async (req, res) => {
  const { complexId } = paramsSchema.parse(req.params);
  const body = createEmailActivitySchema.parse(req.body);

  const units = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.complexId, complexId));

  const participantEmails = new Set(
    [body.contactEmail, ...(body.participants || "").split(/[;,]+/)]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  const matchedUnit = units.find((unit) => {
    const knownEmails = [unit.ownerEmail, unit.tenantEmail]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    return knownEmails.some((email) => participantEmails.has(email));
  });

  const [activity] = await db
    .insert(emailActivitiesTable)
    .values({
      complexId,
      unitId: matchedUnit?.id,
      accountId: body.accountId,
      mailboxAddress: body.mailboxAddress,
      direction: body.direction,
      subject: body.subject,
      bodyPreview: body.bodyPreview,
      contactEmail: body.contactEmail.toLowerCase(),
      participants: body.participants,
      threadId: body.threadId,
      providerMessageId: body.providerMessageId,
      isUnread: body.isUnread ?? body.direction === "Inbound",
      matchedStatus: matchedUnit ? "matched" : "unmatched",
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
    })
    .returning();

  return res.status(201).json({
    ...activity,
    unitNumber: matchedUnit?.unitNumber,
    ownerName: matchedUnit?.ownerName,
    tenantName: matchedUnit?.tenantName,
  });
});

router.post("/emails/:emailId/link", async (req, res) => {
  const { complexId } = paramsSchema.parse(req.params);
  const emailId = z.coerce.number().parse(req.params.emailId);
  const body = z.object({ unitId: z.number() }).parse(req.body);

  const [unit] = await db
    .select()
    .from(unitsTable)
    .where(and(eq(unitsTable.id, body.unitId), eq(unitsTable.complexId, complexId)));

  if (!unit) {
    return res.status(404).json({ error: "Unit not found" });
  }

  const [activity] = await db
    .update(emailActivitiesTable)
    .set({ unitId: unit.id, matchedStatus: "matched" })
    .where(
      and(
        eq(emailActivitiesTable.id, emailId),
        eq(emailActivitiesTable.complexId, complexId),
      ),
    )
    .returning();

  if (!activity) {
    return res.status(404).json({ error: "Email activity not found" });
  }

  return res.json({
    ...activity,
    unitNumber: unit.unitNumber,
    ownerName: unit.ownerName,
    tenantName: unit.tenantName,
  });
});

export default router;
