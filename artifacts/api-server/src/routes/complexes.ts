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
  res.json(complexes);
});

router.post("/", async (req, res) => {
  const body = CreateComplexBody.parse(req.body);
  const [complex] = await db.insert(complexesTable).values(body).returning();
  res.status(201).json(complex);
});

router.get("/:complexId", async (req, res) => {
  const { complexId } = GetComplexParams.parse(req.params);
  const [complex] = await db.select().from(complexesTable).where(eq(complexesTable.id, complexId));
  if (!complex) return res.status(404).json({ error: "Complex not found" });
  res.json(complex);
});

router.put("/:complexId", async (req, res) => {
  const { complexId } = GetComplexParams.parse(req.params);
  const body = UpdateComplexBody.parse(req.body);
  const [complex] = await db.update(complexesTable).set(body).where(eq(complexesTable.id, complexId)).returning();
  if (!complex) return res.status(404).json({ error: "Complex not found" });
  res.json(complex);
});

router.delete("/:complexId", async (req, res) => {
  const { complexId } = DeleteComplexParams.parse(req.params);
  await db.delete(complexesTable).where(eq(complexesTable.id, complexId));
  res.status(204).send();
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

  res.json({
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
