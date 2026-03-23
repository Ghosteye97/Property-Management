import { Router } from "express";
import {
  clearSessionCookie,
  createSessionToken,
  ensureBootstrapUsers,
  findUserByEmail,
  getSessionUserFromRequest,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router = Router();

router.post("/auth/login", async (request, response) => {
  await ensureBootstrapUsers();

  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const password = String(request.body?.password ?? "");

  if (!email || !email.includes("@") || !password) {
    return response.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email;
  const user = await findUserByEmail(normalizedEmail);

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return response.status(401).json({ error: "Incorrect email or password" });
  }

  const sessionToken = createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    portalType: user.portalType,
    fullName: user.fullName,
    tenantId: user.tenantId ?? null,
  });

  setSessionCookie(response, sessionToken);

  return response.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      portalType: user.portalType,
      tenantId: user.tenantId ?? null,
    },
  });
});

router.post("/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  return response.status(204).send();
});

router.get("/auth/me", async (request, response) => {
  await ensureBootstrapUsers();

  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) {
    return response.status(401).json({ error: "Not authenticated" });
  }

  const user = await findUserByEmail(sessionUser.email);
  if (!user || !user.isActive) {
    clearSessionCookie(response);
    return response.status(401).json({ error: "Not authenticated" });
  }

  return response.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      portalType: user.portalType,
      tenantId: user.tenantId ?? null,
    },
  });
});

export default router;
