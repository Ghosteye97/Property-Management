import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db, complexesTable, tenantsTable, usersTable } from "@workspace/db";

type SessionUser = {
  userId: number;
  email: string;
  role: string;
  portalType: string;
  fullName: string;
  tenantId: number | null;
};

const AUTH_COOKIE_NAME = "pm_session";
const AUTH_SECRET = process.env.AUTH_SECRET || "property-mgmt-dev-secret";
const DEFAULT_ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "juanjvr9927@gmail.com";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345678";
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || "Juan J. van Rensburg";
const DEFAULT_TENANT_NAME =
  process.env.DEFAULT_TENANT_NAME || "Default Portfolio";
const DEFAULT_TENANT_SLUG =
  process.env.DEFAULT_TENANT_SLUG || "default-portfolio";
const PLATFORM_ADMIN_EMAIL =
  process.env.PLATFORM_ADMIN_EMAIL || "platform-admin@propertymanager.local";
const PLATFORM_ADMIN_PASSWORD =
  process.env.PLATFORM_ADMIN_PASSWORD || "ChangeMe123!";
const PLATFORM_ADMIN_NAME =
  process.env.PLATFORM_ADMIN_NAME || "Platform Administrator";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signValue(value: string) {
  return base64UrlEncode(createHmac("sha256", AUTH_SECRET).update(value).digest());
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, existingHash] = storedHash.split(":");
  if (!salt || !existingHash) return false;

  const computedHash = scryptSync(password, salt, 64);
  const existingBuffer = Buffer.from(existingHash, "hex");

  if (computedHash.length !== existingBuffer.length) return false;

  return timingSafeEqual(computedHash, existingBuffer);
}

export function createSessionToken(user: SessionUser) {
  const payload = {
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseSessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  if (signValue(encodedPayload) !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionUser & {
      exp?: number;
    };

    if (!payload.exp || payload.exp < Date.now()) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      portalType: payload.portalType,
      fullName: payload.fullName,
      tenantId: payload.tenantId ?? null,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: Parameters<RequestHandler>[1], token: string) {
  response.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function clearSessionCookie(response: Parameters<RequestHandler>[1]) {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
}

export function getSessionUserFromRequest(request: Parameters<RequestHandler>[0]) {
  const cookieValue = request.cookies?.[AUTH_COOKIE_NAME];
  return parseSessionToken(cookieValue);
}

export const requireManagementAuth: RequestHandler = (request, response, next) => {
  const user = getSessionUserFromRequest(request);

  if (!user || user.portalType !== "admin") {
    return response.status(401).json({ error: "Authentication required" });
  }

  response.locals.currentUser = user;
  return next();
};

export const requirePlatformAdmin: RequestHandler = (request, response, next) => {
  const user = getSessionUserFromRequest(request);

  if (!user || user.role !== "Platform Admin") {
    return response.status(403).json({ error: "Platform admin access required" });
  }

  response.locals.currentUser = user;
  return next();
};

export const requireTenantUser: RequestHandler = (request, response, next) => {
  const user = getSessionUserFromRequest(request);

  if (!user || user.portalType !== "admin" || !user.tenantId) {
    return response.status(403).json({ error: "Tenant user access required" });
  }

  response.locals.currentUser = user;
  return next();
};

export const requireTenantScopedComplexAccess: RequestHandler = async (
  request,
  response,
  next,
) => {
  const user = getSessionUserFromRequest(request);

  if (!user || !user.tenantId) {
    return response.status(403).json({ error: "Tenant context required" });
  }

  const complexId = Number(request.params?.complexId);
  if (!Number.isInteger(complexId)) {
    return response.status(400).json({ error: "Invalid complex id" });
  }

  const [complex] = await db
    .select({ id: complexesTable.id })
    .from(complexesTable)
    .where(
      and(
        eq(complexesTable.id, complexId),
        eq(complexesTable.tenantId, user.tenantId),
      ),
    );

  if (!complex) {
    return response.status(404).json({ error: "Complex not found" });
  }

  response.locals.currentUser = user;
  return next();
};

async function ensureDefaultTenant() {
  const [existingTenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, DEFAULT_TENANT_SLUG));

  if (existingTenant) {
    return existingTenant;
  }

  const [createdTenant] = await db
    .insert(tenantsTable)
    .values({
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
      status: "Active",
    })
    .returning();

  return createdTenant;
}

export async function ensureBootstrapUsers() {
  const defaultTenant = await ensureDefaultTenant();

  const [tenantAdmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, DEFAULT_ADMIN_EMAIL));

  if (!tenantAdmin) {
    await db.insert(usersTable).values({
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      fullName: DEFAULT_ADMIN_NAME,
      tenantId: defaultTenant.id,
      role: "Tenant Admin",
      portalType: "admin",
      isActive: true,
    });
  } else if (!tenantAdmin.tenantId || tenantAdmin.role === "Admin") {
    await db
      .update(usersTable)
      .set({
        tenantId: tenantAdmin.tenantId ?? defaultTenant.id,
        role: "Tenant Admin",
        portalType: "admin",
      })
      .where(eq(usersTable.id, tenantAdmin.id));
  }

  const [platformAdmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, PLATFORM_ADMIN_EMAIL));

  if (!platformAdmin) {
    await db.insert(usersTable).values({
      email: PLATFORM_ADMIN_EMAIL,
      passwordHash: hashPassword(PLATFORM_ADMIN_PASSWORD),
      fullName: PLATFORM_ADMIN_NAME,
      tenantId: null,
      role: "Platform Admin",
      portalType: "admin",
      isActive: true,
    });
  }

  return { defaultTenantId: defaultTenant.id };
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  return user;
}
