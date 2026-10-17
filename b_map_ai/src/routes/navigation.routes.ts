import { Router } from "express";
import { NavigationController } from "../controllers/navigation.controller";
import { validateRequest, inferenceRateLimiter, apiKeyAuth } from "../middlewares";
import { ChatQuerySchema, RoutePlanSchema, PoiSearchSchema } from "../validators";

const router = Router();

// Navigation Operations
router.post(
  "/navigation/route-plan",
  inferenceRateLimiter,
  validateRequest(RoutePlanSchema),
  NavigationController.planRoute
);

router.post(
  "/navigation/poi-search",
  inferenceRateLimiter,
  validateRequest(PoiSearchSchema),
  NavigationController.searchPOI
);

router.post("/navigation/reroute", inferenceRateLimiter, NavigationController.reroute);
router.post("/navigation/traffic-advisory", inferenceRateLimiter, NavigationController.trafficAdvisory);

// Conversational Chat with Rate Limiting & Validation
router.post(
  "/chat",
  inferenceRateLimiter,
  validateRequest(ChatQuerySchema),
  NavigationController.chat
);

// Model Lifecycle & Health
router.get("/model/status", NavigationController.getModelStatus);
router.post("/model/start", apiKeyAuth, NavigationController.startModel);

export default router;
