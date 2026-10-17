import { Router } from "express";
import copilotRoutes from "./ai-copilot.routes";
import navigationRoutes from "./navigation.routes";

const router = Router();

// Mount copilot platform routes under /v1/ai-copilot and navigation routes
router.use("/v1/ai-copilot", copilotRoutes);
router.use("/", navigationRoutes);

export { copilotRoutes, navigationRoutes };
export default router;
