/**
 * ============================================================================
 *           B-MAP AI: UNIFIED GEOSPATIAL & TELEMATICS AI ENGINES
 * ============================================================================
 * Centralized registry and export gateway for all 7 AI Pillars across the
 * B-Map AI microservice:
 *
 * 1. In-Drive Conversational Copilot & Agentic LLM Engine
 * 2. Multimodal Computer Vision AI & Road Scene Hazard Analyzer
 * 3. Predictive Traffic & Spatio-Temporal Departure Optimizer
 * 4. POI Intelligence & Destination Arrival Briefing
 * 5. Trajectory Mining & Map Production AI
 * 6. Sensor Machine Learning, Perception & ADAS
 * 7. Intelligent Route Optimization & Environmental AI
 */

// Core Inference & Navigation Engines
export {
  LlmService,
  LlmService as gemmaInferenceEngineService,
} from "../services/llm.service";

export {
  NavigationService,
  NavigationService as aiNavigationEngineService,
} from "../services/navigation.service";

export {
  KeepAliveService,
} from "../services/keep-alive.service";

// ============================================================================
// 🗣️ Pillar 1: In-Drive Conversational Copilot & Agentic LLM Engine
// ============================================================================
export {
  AiCopilotService,
  AiCopilotService as aiCopilotEngineService,
  ProcessCopilotMessageInput,
  CopilotMessageResponse,
} from "../services/ai-copilot.service";

// ============================================================================
// 👁️ Pillar 2: Multimodal Computer Vision AI & Road Scene Hazard Engine
// ============================================================================
export {
  AiVisionAnalyzerService,
  AiVisionAnalyzerService as aiVisionHazardEngineService,
  ParkingOccupancyResult,
} from "../services/ai-vision-analyzer.service";

export {
  DetectedHazard,
  DetectedTrafficSign,
} from "../models/ai-vision-incident.model";

// ============================================================================
// 📈 Pillar 3: Predictive Traffic & Spatio-Temporal Departure Optimizer Engine
// ============================================================================
export {
  AiTrafficForecasterService,
  AiTrafficForecasterService as aiTrafficForecasterEngineService,
  DepartureSlotEvaluation,
  BottleneckCorridor,
  DepartureOptimizationResult,
} from "../services/ai-traffic-forecaster.service";

// ============================================================================
// 🏨 Pillar 4: POI Intelligence & Destination Arrival Briefing Engine
// ============================================================================
export {
  AiPoiIntelligenceService,
  AiPoiIntelligenceService as aiPoiIntelligenceEngineService,
} from "../services/ai-poi-intelligence.service";

// ============================================================================
// 🛰️ Pillar 5: Big-Data Trajectory Mining & Automated Map Production Engines
// ============================================================================
export {
  TrajectoryMiningService,
  TrajectoryMiningService as trajectoryMiningEngineService,
  GpsPoint,
  StayPoint,
} from "../services/trajectory-mining.service";

export {
  PoiResolutionService,
  PoiResolutionService as poiResolutionEngineService,
  PoiCandidate,
} from "../services/poi-resolution.service";

export {
  RoadProductionService,
  RoadProductionService as roadProductionEngineService,
} from "../services/road-production.service";

export {
  RoadChangeRecord,
} from "../models/road-change.model";

// ============================================================================
// 🏃 Pillar 6: Sensor Machine Learning, Perception & ADAS Engines
// ============================================================================
export {
  ActivityRecognitionService,
  ActivityRecognitionService as activityRecognitionEngineService,
  MotionState,
  InertialSensorPayload,
  ActivityStateTransition,
} from "../services/activity-recognition.service";

export {
  SrNavigationService,
  SrNavigationService as aiSrNavigationEngineService,
  PerceptionObstacle,
  AdasAssessment,
} from "../services/sr-navigation.service";

export {
  VeteranDriverLayerService,
  VeteranDriverLayerService as veteranDriverLayerEngineService,
  RoadEdgeInsight,
} from "../services/veteran-driver-layer.service";

export {
  ArWalkCycleService,
  ArWalkCycleService as aiArWalkCycleEngineService,
  CameraPose,
  ArHudElement,
} from "../services/ar-walk-cycle.service";

// ============================================================================
// ⚡ Pillar 7: Intelligent Route Optimization & Environmental AI Engines
// ============================================================================
export {
  DynamicRecommendationService,
  DynamicRecommendationService as dynamicRecommendationEngineService,
  DynamicRecommendation,
} from "../services/dynamic-recommendation.service";

export {
  EnvironmentService,
  EnvironmentService as environmentalAiEngineService,
  EnvironmentalAqi,
  EcoRouteProfile,
} from "../services/environment.service";

export {
  VernacularService,
  VernacularService as vernacularTtsEngineService,
  IndianLanguage,
  VernacularVoicePrompt,
} from "../services/vernacular.service";

// ============================================================================
// 🛡️ Zero-Trust Security, Anti-Spoofing & Spatial Attestation Engines
// ============================================================================
export {
  AntiSpoofingService,
  AntiSpoofingService as antiSpoofingEngineService,
  TelemetryPoint,
  SpoofingAssessment,
} from "../services/anti-spoofing.service";

export {
  ProofOfPresenceService,
  ProofOfPresenceService as proofOfPresenceEngineService,
  ProofOfPresenceAttestation,
  IssueAttestationParams,
  VerifyAttestationResult,
} from "../services/proof-of-presence.service";

export {
  ZeroTrustEngineService,
  ZeroTrustEngineService as zeroTrustDefenseEngineService,
  ZeroTrustEvaluationRequest,
  ZeroTrustVerdict,
} from "../services/zero-trust-engine.service";

