import { Router } from "express";
import { count, eq } from "drizzle-orm";
import { db, complexesTable, tenantsTable, usersTable } from "@workspace/db";
import { hashPassword, requirePlatformAdmin } from "../lib/auth";
import { z } from "zod";

const router = Router();

const createTenantSchema = z.object({
  tenantName: z.string().min(2),
  slug: z.string().min(2),
  adminFullName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

router.use(requirePlatformAdmin);

router.get("/tenants", async (_request, response) => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);

  const tenantSummaries = await Promise.all(
    tenants.map(async (tenant) => {
      const [complexesCount] = await db
        .select({ value: count() })
        .from(complexesTable)
        .where(eq(complexesTable.tenantId, tenant.id));

      const [usersCount] = await db
        .select({ value: count() })
        .from(usersTable)
        .where(eq(usersTable.tenantId, tenant.id));

      return {
        ...tenant,
        complexesCount: Number(complexesCount?.value ?? 0),
        usersCount: Number(usersCount?.value ?? 0),
      };
    }),
  );

  return response.json(tenantSummaries);
});

router.post("/tenants", async (request, response) => {
  const body = createTenantSchema.parse(request.body);

  const [existingTenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, body.slug));

  if (existingTenant) {
    return response.status(409).json({ error: "Tenant slug already exists" });
  }

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, body.adminEmail.toLowerCase()));

  if (existingUser) {
    return response.status(409).json({ error: "Admin email already exists" });
  }

  const tenant = await db.transaction(async (tx) => {
    const [createdTenant] = await tx
      .insert(tenantsTable)
      .values({
        name: body.tenantName,
        slug: body.slug,
        status: "Active",
      })
      .returning();

    await tx.insert(usersTable).values({
      email: body.adminEmail.toLowerCase(),
      passwordHash: hashPassword(body.adminPassword),
      fullName: body.adminFullName,
      tenantId: createdTenant.id,
      role: "Tenant Admin",
      portalType: "admin",
      isActive: true,
    });

    return createdTenant;
  });

  return response.status(201).json(tenant);
});

export default router;
