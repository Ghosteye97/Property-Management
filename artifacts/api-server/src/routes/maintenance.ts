import { Router } from "express";
import { db } from "@workspace/db";
import { maintenanceRequestsTable, unitsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListMaintenanceRequestsParams,
  CreateMaintenanceRequestParams,
  CreateMaintenanceRequestBody,
  UpdateMaintenanceRequestParams,
  UpdateMaintenanceRequestBody,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { complexId } = ListMaintenanceRequestsParams.parse(req.params);
  const requests = await db
    .select({
      id: maintenanceRequestsTable.id,
      complexId: maintenanceRequestsTable.complexId,
      unitId: maintenanceRequestsTable.unitId,
      unitNumber: unitsTable.unitNumber,
      title: maintenanceRequestsTable.title,
      description: maintenanceRequestsTable.description,
      category: maintenanceRequestsTable.category,
      priority: maintenanceRequestsTable.priority,
      status: maintenanceRequestsTable.status,
      assignedTo: maintenanceRequestsTable.assignedTo,
      resolvedAt: maintenanceRequestsTable.resolvedAt,
      notes: maintenanceRequestsTable.notes,
      createdAt: maintenanceRequestsTable.createdAt,
    })
    .from(maintenanceRequestsTable)
    .leftJoin(unitsTable, eq(maintenanceRequestsTable.unitId, unitsTable.id))
    .where(eq(maintenanceRequestsTable.complexId, complexId))
    .orderBy(maintenanceRequestsTable.createdAt);
  res.json(requests);
});

router.post("/", async (req, res) => {
  const { complexId } = CreateMaintenanceRequestParams.parse(req.params);
  const body = CreateMaintenanceRequestBody.parse(req.body);
  const [request] = await db
    .insert(maintenanceRequestsTable)
    .values({ ...body, complexId })
    .returning();
  res.status(201).json(request);
});

router.put("/:requestId", async (req, res) => {
  const { complexId, requestId } = UpdateMaintenanceRequestParams.parse(req.params);
  const body = UpdateMaintenanceRequestBody.parse(req.body);
  const updateData: Record<string, unknown> = {
    status: body.status,
    assignedTo: body.assignedTo,
    notes: body.notes,
  };
  if (body.resolvedAt) updateData.resolvedAt = new Date(body.resolvedAt);
  if (body.status === "Completed" && !body.resolvedAt) updateData.resolvedAt = new Date();

  const [request] = await db
    .update(maintenanceRequestsTable)
    .set(updateData)
    .where(and(eq(maintenanceRequestsTable.complexId, complexId), eq(maintenanceRequestsTable.id, requestId)))
    .returning();
  if (!request) return res.status(404).json({ error: "Maintenance request not found" });
  res.json(request);
});

export default router;
