import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, unitsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListInvoicesParams,
  CreateInvoiceParams,
  CreateInvoiceBody,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  BulkBillingRunParams,
  BulkBillingRunBody,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.get("/invoices", async (req, res) => {
  const { complexId } = ListInvoicesParams.parse(req.params);
  const invoices = await db
    .select({
      id: invoicesTable.id,
      complexId: invoicesTable.complexId,
      unitId: invoicesTable.unitId,
      unitNumber: unitsTable.unitNumber,
      ownerName: unitsTable.ownerName,
      type: invoicesTable.type,
      amount: invoicesTable.amount,
      status: invoicesTable.status,
      dueDate: invoicesTable.dueDate,
      paidDate: invoicesTable.paidDate,
      description: invoicesTable.description,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(unitsTable, eq(invoicesTable.unitId, unitsTable.id))
    .where(eq(invoicesTable.complexId, complexId))
    .orderBy(invoicesTable.createdAt);
  res.json(invoices);
});

router.post("/invoices", async (req, res) => {
  const { complexId } = CreateInvoiceParams.parse(req.params);
  const body = CreateInvoiceBody.parse(req.body);
  const [invoice] = await db
    .insert(invoicesTable)
    .values({ ...body, complexId, dueDate: new Date(body.dueDate) })
    .returning();

  await db
    .update(unitsTable)
    .set({ outstandingBalance: db.$with("q").as(
      db.select({ val: unitsTable.outstandingBalance }).from(unitsTable).where(eq(unitsTable.id, body.unitId))
    ) as unknown as number })
    .where(eq(unitsTable.id, body.unitId));

  res.status(201).json(invoice);
});

router.put("/invoices/:invoiceId", async (req, res) => {
  const { complexId, invoiceId } = UpdateInvoiceParams.parse(req.params);
  const body = UpdateInvoiceBody.parse(req.body);
  const updateData: Record<string, unknown> = { status: body.status };
  if (body.paidDate) updateData.paidDate = new Date(body.paidDate);

  const [invoice] = await db
    .update(invoicesTable)
    .set(updateData)
    .where(and(eq(invoicesTable.complexId, complexId), eq(invoicesTable.id, invoiceId)))
    .returning();

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  if (body.status === "Paid") {
    const unit = await db.select().from(unitsTable).where(eq(unitsTable.id, invoice.unitId));
    if (unit[0]) {
      const newBalance = Math.max(0, (unit[0].outstandingBalance ?? 0) - invoice.amount);
      await db.update(unitsTable).set({ outstandingBalance: newBalance }).where(eq(unitsTable.id, invoice.unitId));
    }
  }

  res.json(invoice);
});

router.post("/billing/bulk-run", async (req, res) => {
  const { complexId } = BulkBillingRunParams.parse(req.params);
  const body = BulkBillingRunBody.parse(req.body);

  const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId));

  const invoicesToInsert = units.map((unit) => ({
    complexId,
    unitId: unit.id,
    type: body.type,
    amount: body.amount,
    status: "Pending" as const,
    dueDate: new Date(body.dueDate),
    description: body.description ?? `${body.type} - Bulk Run`,
  }));

  await db.insert(invoicesTable).values(invoicesToInsert);

  for (const unit of units) {
    const newBalance = (unit.outstandingBalance ?? 0) + body.amount;
    await db.update(unitsTable).set({ outstandingBalance: newBalance }).where(eq(unitsTable.id, unit.id));
  }

  res.json({
    invoicesCreated: invoicesToInsert.length,
    totalAmount: invoicesToInsert.length * body.amount,
  });
});

export default router;
