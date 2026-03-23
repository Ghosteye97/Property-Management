import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import complexesRouter from "./complexes";
import unitsRouter from "./units";
import billingRouter from "./billing";
import maintenanceRouter from "./maintenance";
import meetingsRouter from "./meetings";
import communicationsRouter from "./communications";
import inboxRouter from "./inbox";
import documentsRouter from "./documents";
import reportsRouter from "./reports";

import {
  requireManagementAuth,
  requireTenantScopedComplexAccess,
} from "../lib/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireManagementAuth);
router.use("/admin", adminRouter);
router.use("/complexes", complexesRouter);
router.use("/complexes/:complexId/units", requireTenantScopedComplexAccess, unitsRouter);
router.use("/complexes/:complexId", requireTenantScopedComplexAccess, billingRouter);
router.use("/complexes/:complexId/maintenance", requireTenantScopedComplexAccess, maintenanceRouter);
router.use("/complexes/:complexId/meetings", requireTenantScopedComplexAccess, meetingsRouter);
router.use("/complexes/:complexId/communications", requireTenantScopedComplexAccess, communicationsRouter);
router.use("/complexes/:complexId/inbox", requireTenantScopedComplexAccess, inboxRouter);
router.use("/complexes/:complexId/documents", requireTenantScopedComplexAccess, documentsRouter);
router.use("/complexes/:complexId", requireTenantScopedComplexAccess, reportsRouter);

export default router;
