import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, unitsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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

function toOptionalDate(value: unknown) {
  if (value == null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(String(value));
}

async function syncUnitOutstandingBalance(
  executor: Pick<typeof db, "select" | "update">,
  unitId: number,
) {
  const [balanceRow] = await executor
    .select({
      outstandingBalance: sql<number>`
        coalesce(
          sum(
            case
              when ${invoicesTable.status} = 'Paid' then 0
              else ${invoicesTable.amount}
            end
          ),
          0
        )
      `,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.unitId, unitId));

  const outstandingBalance = Number(balanceRow?.outstandingBalance ?? 0);

  await executor
    .update(unitsTable)
    .set({ outstandingBalance })
    .where(eq(unitsTable.id, unitId));
}

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
  return res.json(invoices);
});

router.post("/invoices", async (req, res) => {
  const { complexId } = CreateInvoiceParams.parse(req.params);
  const body = CreateInvoiceBody.parse({
    ...req.body,
    dueDate: toOptionalDate(req.body?.dueDate),
  });
  const invoice = await db.transaction(async (tx) => {
    const [createdInvoice] = await tx
      .insert(invoicesTable)
      .values({ ...body, complexId, dueDate: new Date(body.dueDate) })
      .returning();

    await syncUnitOutstandingBalance(tx, body.unitId);

    return createdInvoice;
  });

  return res.status(201).json(invoice);
});

router.put("/invoices/:invoiceId", async (req, res) => {
  const { complexId, invoiceId } = UpdateInvoiceParams.parse(req.params);
  const body = UpdateInvoiceBody.parse({
    ...req.body,
    paidDate: toOptionalDate(req.body?.paidDate),
  });
  const updateData: Record<string, unknown> = { status: body.status };
  if (body.paidDate) updateData.paidDate = new Date(body.paidDate);

  const invoice = await db.transaction(async (tx) => {
    const [updatedInvoice] = await tx
      .update(invoicesTable)
      .set(updateData)
      .where(and(eq(invoicesTable.complexId, complexId), eq(invoicesTable.id, invoiceId)))
      .returning();

    if (!updatedInvoice) {
      return null;
    }

    await syncUnitOutstandingBalance(tx, updatedInvoice.unitId);

    return updatedInvoice;
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  return res.json(invoice);
});

router.post("/billing/bulk-run", async (req, res) => {
  const { complexId } = BulkBillingRunParams.parse(req.params);
  const body = BulkBillingRunBody.parse({
    ...req.body,
    dueDate: toOptionalDate(req.body?.dueDate),
  });

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

  return res.json({
    invoicesCreated: invoicesToInsert.length,
    totalAmount: invoicesToInsert.length * body.amount,
  });
});

export default router;
