import { Router, Request, Response } from "express";
import { AiCopilotController } from "../controllers/ai-copilot.controller";
import { validateRequest, inferenceRateLimiter } from "../middlewares";
import {
  CopilotMessageSchema,
  VisionAnalyzeSchema,
  EcoRouteSchema,
  ClassifyIntentSchema,
  SessionIdParamSchema,
  ArrivalBriefingSchema,
  IssueProofOfPresenceSchema,
  VerifyProofOfPresenceSchema,
} from "../validators";
import { AiVisionAnalyzerService } from "../services/ai-vision-analyzer.service";
import { AiTrafficForecasterService } from "../services/ai-traffic-forecaster.service";
import { AiPoiIntelligenceService } from "../services/ai-poi-intelligence.service";
import { TrajectoryMiningService } from "../services/trajectory-mining.service";
import { PoiResolutionService } from "../services/poi-resolution.service";
import { RoadProductionService } from "../services/road-production.service";
import { ActivityRecognitionService } from "../services/activity-recognition.service";
import { SrNavigationService } from "../services/sr-navigation.service";
import { VeteranDriverLayerService } from "../services/veteran-driver-layer.service";
import { ArWalkCycleService } from "../services/ar-walk-cycle.service";
import { DynamicRecommendationService } from "../services/dynamic-recommendation.service";
import { EnvironmentService } from "../services/environment.service";
import { VernacularService, IndianLanguage } from "../services/vernacular.service";
import { ProofOfPresenceService } from "../services/proof-of-presence.service";
import { ZeroTrustEngineService } from "../services/zero-trust-engine.service";


const router = Router();

// ============================================================================
// 🗣️ Module 1: In-Drive Conversational Copilot & Agentic LLM
// ============================================================================
router.post(
  "/message",
  inferenceRateLimiter,
  validateRequest(CopilotMessageSchema),
  AiCopilotController.handleMessage
);
router.post("/classify-intent", validateRequest(ClassifyIntentSchema), AiCopilotController.classifyIntent);
router.get("/session/:sessionId", validateRequest(SessionIdParamSchema, "params"), AiCopilotController.getSession);

// ============================================================================
// 👁️ Module 2: Multimodal Computer Vision AI & Road Scene Hazard Analyzer
// ============================================================================
router.post("/vision/analyze", validateRequest(VisionAnalyzeSchema), async (req: Request, res: Response) => {
  try {
    const result = await AiVisionAnalyzerService.analyzeRoadScene(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/vision/incidents/nearby", async (req: Request, res: Response) => {
  try {
    const lng = parseFloat(req.query.lng as string) || 77.2177;
    const lat = parseFloat(req.query.lat as string) || 28.6304;
    const radius = parseFloat(req.query.radius as string) || 5000;

    const results = await AiVisionAnalyzerService.findNearbyIncidents([lng, lat], radius);
    res.json({
      success: true,
      query: { lng, lat, radiusMeters: radius },
      data: results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/vision/parking-occupancy/:facilityId", (req: Request, res: Response) => {
  try {
    const facilityId = Array.isArray(req.params.facilityId)
      ? req.params.facilityId[0]
      : req.params.facilityId || "facility_p1";
    const result = AiVisionAnalyzerService.estimateParkingOccupancy(facilityId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 📈 Module 3: AI Predictive Traffic & Spatio-Temporal Departure Optimizer
// ============================================================================
router.post("/traffic/departure-optimizer", (req: Request, res: Response) => {
  try {
    const { origin, destination, targetDepartureTimeIso, distanceKm } = req.body;
    if (!origin || !destination) {
      res.status(400).json({ success: false, error: "'origin' and 'destination' are required" });
      return;
    }
    const result = AiTrafficForecasterService.optimizeDeparture({
      origin,
      destination,
      targetDepartureTimeIso,
      distanceKm,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 🏨 Module 4: AI POI Intelligence & Destination Arrival Briefing
// ============================================================================
router.get("/poi/intelligence", (req: Request, res: Response) => {
  try {
    const name = (req.query.name as string) || "Central Plaza";
    const category = (req.query.category as string) || "Commercial Hub";
    const result = AiPoiIntelligenceService.getPoiIntelligence(name, category);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/poi/arrival-briefing", validateRequest(ArrivalBriefingSchema), (req: Request, res: Response) => {
  try {
    const { poiName, distanceMeters, entranceRoad, vacantBays, parkingLevel } = req.body;
    const result = AiPoiIntelligenceService.generateArrivalAudioBriefing({
      poiName,
      distanceMeters,
      entranceRoad,
      vacantBays,
      parkingLevel,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 🛰️ Module 5: Big-Data Trajectory Mining & Map Production AI
// ============================================================================
router.post("/map/stay-points", (req: Request, res: Response) => {
  try {
    const { gpsTraces } = req.body;
    if (!gpsTraces || !Array.isArray(gpsTraces)) {
      res.status(400).json({ success: false, error: "'gpsTraces' array is required" });
      return;
    }
    const stayPoints = TrajectoryMiningService.extractStayPoints(gpsTraces);
    const hotspots = TrajectoryMiningService.clusterHotspots(stayPoints);
    res.json({ success: true, data: { stayPoints, hotspots } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/map/fuse-poi", (req: Request, res: Response) => {
  try {
    const { name, category, coordinates, source } = req.body;
    if (!name || !category || !coordinates) {
      res.status(400).json({ success: false, error: "'name', 'category', and 'coordinates' are required" });
      return;
    }
    const result = PoiResolutionService.fuseCandidate({
      name,
      category,
      coordinates,
      source: source || "fleet_trace",
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/map/road-centerline", (req: Request, res: Response) => {
  try {
    const { corridorName, rawGpsTraversingPoints, averageObservedSpeedKmH, traversingVehicleCount } =
      req.body;
    const result = RoadProductionService.extractRoadCenterline({
      corridorName: corridorName || "New Mined Centerline",
      rawGpsTraversingPoints: rawGpsTraversingPoints || [],
      averageObservedSpeedKmH: averageObservedSpeedKmH || 65,
      traversingVehicleCount: traversingVehicleCount || 150,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/map/detect-zero-flow", (req: Request, res: Response) => {
  try {
    const result = RoadProductionService.detectZeroFlowAnomaly(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 🏃 Module 6: Sensor Machine Learning, Perception & ADAS
// ============================================================================
router.post("/sensors/activity", (req: Request, res: Response) => {
  try {
    const result = ActivityRecognitionService.classifyActivity(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/adas/assess", (req: Request, res: Response) => {
  try {
    const result = SrNavigationService.computeAdasState(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/veteran/edge-insight", (req: Request, res: Response) => {
  try {
    const edgeId = (req.query.edgeId as string) || "edge_01";
    const roadName = (req.query.roadName as string) || "Central Crossing Market Road";
    const result = VeteranDriverLayerService.evaluateEdge(edgeId, roadName);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/ar/hud-projection", (req: Request, res: Response) => {
  try {
    const { camera, targetWorldCoords, elementType, label } = req.body;
    if (!camera || !targetWorldCoords) {
      res.status(400).json({ success: false, error: "'camera' and 'targetWorldCoords' are required" });
      return;
    }
    const result = ArWalkCycleService.projectToArHud(
      camera,
      targetWorldCoords,
      elementType || "ground_chevron",
      label
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ⚡ Module 7: Intelligent Route Optimization & Environmental AI
// ============================================================================
router.post("/routing/bpr-weight", (req: Request, res: Response) => {
  try {
    const { tFreeSeconds, vFreeKmH, vActualKmH, alpha, beta } = req.body;
    const result = DynamicRecommendationService.calculateBprWeight(
      tFreeSeconds || 300,
      vFreeKmH || 80,
      vActualKmH || 35,
      alpha,
      beta
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/routing/dynamic-recommendations", (req: Request, res: Response) => {
  try {
    const result = DynamicRecommendationService.evaluateInDriveRecommendations(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/routing/eco-route", validateRequest(EcoRouteSchema), (req: Request, res: Response) => {
  try {
    const result = EnvironmentService.computeEcoRoute(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/vernacular/voice-prompt", (req: Request, res: Response) => {
  try {
    const { language, distanceText, turnDirection, landmark } = req.body;
    const result = VernacularService.getVoiceGuidance({
      language: (language as IndianLanguage) || "hi",
      distanceText: distanceText || "200 meters",
      turnDirection: turnDirection || "left",
      landmark,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/vernacular/languages", (_req: Request, res: Response) => {
  res.json({ success: true, data: VernacularService.getSupportedLanguages() });
});

// ============================================================================
// 🛡️ Security, Proof-of-Presence & Zero-Trust Defense Endpoints
// ============================================================================
router.post(
  "/security/proof-of-presence/issue",
  validateRequest(IssueProofOfPresenceSchema),
  (req: Request, res: Response) => {
    try {
      const attestation = ProofOfPresenceService.issueAttestation(req.body);
      res.json({ success: true, data: attestation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.post(
  "/security/proof-of-presence/verify",
  validateRequest(VerifyProofOfPresenceSchema),
  (req: Request, res: Response) => {
    try {
      const result = ProofOfPresenceService.verifyAttestation(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.post("/security/zero-trust/evaluate", (req: Request, res: Response) => {
  try {
    const verdict = ZeroTrustEngineService.evaluateRequest(req.body);
    res.json({ success: true, data: verdict });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

