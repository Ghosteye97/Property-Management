import { Router, type IRouter } from "express";
import healthRouter from "./health";
import complexesRouter from "./complexes";
import unitsRouter from "./units";
import billingRouter from "./billing";
import maintenanceRouter from "./maintenance";
import communicationsRouter from "./communications";
import documentsRouter from "./documents";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/complexes", complexesRouter);
router.use("/complexes/:complexId/units", unitsRouter);
router.use("/complexes/:complexId", billingRouter);
router.use("/complexes/:complexId/maintenance", maintenanceRouter);
router.use("/complexes/:complexId/communications", communicationsRouter);
router.use("/complexes/:complexId/documents", documentsRouter);
router.use("/complexes/:complexId", reportsRouter);

export default router;
