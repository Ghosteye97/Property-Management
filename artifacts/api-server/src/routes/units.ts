import { Router } from "express";
import { db } from "@workspace/db";
import { unitsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListUnitsParams,
  CreateUnitParams,
  CreateUnitBody,
  UpdateUnitParams,
  UpdateUnitBody,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { complexId } = ListUnitsParams.parse(req.params);
  const units = await db.select().from(unitsTable).where(eq(unitsTable.complexId, complexId)).orderBy(unitsTable.unitNumber);
  res.json(units);
});

router.post("/", async (req, res) => {
  const { complexId } = CreateUnitParams.parse(req.params);
  const body = CreateUnitBody.parse(req.body);
  const [unit] = await db.insert(unitsTable).values({ ...body, complexId }).returning();
  res.status(201).json(unit);
});

router.get("/:unitId", async (req, res) => {
  const { complexId, unitId } = UpdateUnitParams.parse(req.params);
  const [unit] = await db.select().from(unitsTable).where(and(eq(unitsTable.complexId, complexId), eq(unitsTable.id, unitId)));
  if (!unit) return res.status(404).json({ error: "Unit not found" });
  res.json(unit);
});

router.put("/:unitId", async (req, res) => {
  const { complexId, unitId } = UpdateUnitParams.parse(req.params);
  const body = UpdateUnitBody.parse(req.body);
  const [unit] = await db.update(unitsTable).set(body).where(and(eq(unitsTable.complexId, complexId), eq(unitsTable.id, unitId))).returning();
  if (!unit) return res.status(404).json({ error: "Unit not found" });
  res.json(unit);
});

export default router;
