import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetFinancialReportParams, GetOccupancyReportParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.get("/reports/financial", async (req, res) => {
  const { complexId } = GetFinancialReportParams.parse(req.params);

  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.complexId, complexId));

  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const totalCollected = invoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled").reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const statusCounts: Record<string, number> = {};
  for (const inv of invoices) {
    statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + inv.amount;
  }
  const invoicesByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  const monthlyMap: Record<string, number> = {};
  for (const inv of invoices.filter((i) => i.status === "Paid")) {
    const date = new Date(inv.paidDate ?? inv.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + inv.amount;
  }
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  res.json({
    complexId,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    collectionRate,
    invoicesByStatus,
    monthlyRevenue,
  });
});

router.get("/reports/occupancy", async (req, res) => {
  const { complexId } = GetOccupancyReportParams.parse(req.params);

  const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId));
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "Occupied").length;
  const vacantUnits = units.filter((u) => u.status === "Vacant").length;
  const underMaintenanceUnits = units.filter((u) => u.status === "Under Maintenance").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  res.json({
    complexId,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    underMaintenanceUnits,
    occupancyRate,
    unitsByStatus: [
      { name: "Occupied", value: occupiedUnits },
      { name: "Vacant", value: vacantUnits },
      { name: "Under Maintenance", value: underMaintenanceUnits },
    ],
  });
});

export default router;
