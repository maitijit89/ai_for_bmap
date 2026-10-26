import { Router } from "express";
import { AppVersionController } from "../controllers/app-version.controller";

const router = Router();

// Version check & patch update enforcement endpoint
router.get("/check", AppVersionController.checkVersion);

// Security advisories and zero-trust hardening report
router.get("/security/advisories", AppVersionController.getSecurityAdvisories);

export default router;
