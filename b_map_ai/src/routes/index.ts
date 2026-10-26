import { Router } from "express";
import copilotRoutes from "./ai-copilot.routes";
import navigationRoutes from "./navigation.routes";
import appVersionRoutes from "./app-version.routes";

const router = Router();

// Mount copilot platform routes under /v1/ai-copilot and navigation routes
router.use("/v1/ai-copilot", copilotRoutes);
router.use("/v1/app-version", appVersionRoutes);
router.use("/v1", appVersionRoutes);
router.use("/", navigationRoutes);

export { copilotRoutes, navigationRoutes, appVersionRoutes };
export default router;

