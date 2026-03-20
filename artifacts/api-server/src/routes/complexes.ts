import { Router } from "express";
import { db } from "@workspace/db";
import {
  complexesTable,
  unitsTable,
  invoicesTable,
  maintenanceRequestsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateComplexBody,
  GetComplexParams,
  UpdateComplexBody,
  DeleteComplexParams,
  GetComplexStatsParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const complexes = await db.select().from(complexesTable).orderBy(complexesTable.createdAt);
  return res.json(complexes);
});

router.post("/", async (req, res) => {
  const body = CreateComplexBody.parse(req.body);

  if (!Number.isInteger(body.numberOfUnits) || body.numberOfUnits < 0) {
    return res.status(400).json({ error: "numberOfUnits must be a non-negative integer" });
  }

  const complex = await db.transaction(async (tx) => {
    const [createdComplex] = await tx.insert(complexesTable).values(body).returning();

    if (body.numberOfUnits > 0) {
      const unitsToInsert = Array.from({ length: body.numberOfUnits }, (_, index) => ({
        complexId: createdComplex.id,
        unitNumber: String(index + 1),
        status: "Vacant",
      }));

      await tx.insert(unitsTable).values(unitsToInsert);
    }

    return createdComplex;
  });

  return res.status(201).json(complex);
});

router.get("/:complexId", async (req, res) => {
  const { complexId } = GetComplexParams.parse(req.params);
  const [complex] = await db.select().from(complexesTable).where(eq(complexesTable.id, complexId));
  if (!complex) {
    return res.status(404).json({ error: "Complex not found" });
  }
  return res.json(complex);
});

router.put("/:complexId", async (req, res) => {
  const { complexId } = GetComplexParams.parse(req.params);
  const body = UpdateComplexBody.parse(req.body);
  const [complex] = await db.update(complexesTable).set(body).where(eq(complexesTable.id, complexId)).returning();
  if (!complex) {
    return res.status(404).json({ error: "Complex not found" });
  }
  return res.json(complex);
});

router.delete("/:complexId", async (req, res) => {
  const { complexId } = DeleteComplexParams.parse(req.params);
  await db.delete(complexesTable).where(eq(complexesTable.id, complexId));
  return res.status(204).send();
});

router.get("/:complexId/stats", async (req, res) => {
  const { complexId } = GetComplexStatsParams.parse(req.params);

  const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId));
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "Occupied").length;
  const vacantUnits = units.filter((u) => u.status === "Vacant").length;

  const outstandingBalance = units.reduce((sum, u) => sum + (u.outstandingBalance ?? 0), 0);

  const openMaintenance = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(maintenanceRequestsTable)
    .where(and(eq(maintenanceRequestsTable.complexId, complexId), eq(maintenanceRequestsTable.status, "Open")));

  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.complexId, complexId));
  const totalRevenue = invoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

  return res.json({
    totalUnits,
    occupiedUnits,
    vacantUnits,
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    openMaintenanceRequests: openMaintenance[0]?.count ?? 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    collectionRate,
  });
});

export default router;
