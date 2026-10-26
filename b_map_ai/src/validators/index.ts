import { z } from "zod";

/**
 * Coordinate schema: [longitude, latitude]
 */
export const CoordinatesSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

/**
 * Vehicle Telemetry Schema
 */
export const VehicleTelemetrySchema = z.object({
  coordinates: CoordinatesSchema,
  speedKmH: z.number().min(0).max(450),
  headingDeg: z.number().min(0).max(360),
  remainingDistanceMeters: z.number().min(0),
  etaMinutes: z.number().min(0),
  batteryOrFuelSoC: z.number().min(0).max(100),
  activeRouteId: z.string().min(1),
  destinationMetadata: z.object({
    name: z.string().min(1),
    coordinates: CoordinatesSchema,
    address: z.string().optional(),
    category: z.string().optional(),
  }),
});

/**
 * Copilot Message Schema
 */
export const CopilotMessageSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  driverId: z.string().optional(),
  prompt: z.string().min(1, "Prompt cannot be empty").max(2000, "Prompt is too long"),
  telemetry: VehicleTelemetrySchema,
});

/**
 * Vision Analyze Schema
 */
export const VisionAnalyzeSchema = z.object({
  coordinates: CoordinatesSchema.optional(),
  roadName: z.string().optional(),
  currentSpeedKmH: z.number().optional(),
  digitalMapSpeedLimitKmH: z.number().optional(),
  imageBase64: z.string().optional(),
  imageUrl: z.string().optional(),
  currentTelemetry: VehicleTelemetrySchema.optional(),
  cameraFacing: z.enum(["forward_windshield", "driver_cabin", "rear_facing"]).optional(),
});

/**
 * Traffic Departure Optimizer Schema
 */
export const DepartureOptimizerSchema = z.object({
  origin: CoordinatesSchema,
  destination: CoordinatesSchema,
  targetArrivalIso: z.string().min(1, "targetArrivalIso is required"),
  flexibilityMinutes: z.number().min(0).max(360).optional(),
});

/**
 * Map Stay Points Detection Schema
 */
export const StayPointsTraceSchema = z.object({
  gpsTrace: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        timestamp: z.number(),
        speed: z.number().optional(),
      })
    )
    .min(2, "At least 2 GPS trace points required"),
  distThresholdMeters: z.number().positive().optional(),
  timeThresholdSeconds: z.number().positive().optional(),
});

/**
 * Route Eco Profile Schema
 */
export const EcoRouteSchema = z.object({
  routeId: z.string().default("route_primary_eco"),
  distanceKm: z.number().positive("Distance must be greater than zero"),
  elevationProfile: z
    .array(
      z.object({
        distanceKm: z.number(),
        elevationMeters: z.number(),
      })
    )
    .default([
      { distanceKm: 0, elevationMeters: 120 },
      { distanceKm: 12, elevationMeters: 80 },
    ]),
  vehicleWeightKg: z.number().positive().optional(),
});

/**
 * Basic Navigation Request Schemas
 */
export const ChatQuerySchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  system_prompt: z.string().optional(),
  max_tokens: z.number().int().min(1).max(2048).optional(),
});

export const RoutePlanSchema = z.object({
  origin: z.string().min(1, "origin is required"),
  destination: z.string().min(1, "destination is required"),
  travel_mode: z.enum(["driving", "walking", "cycling", "transit"]).optional(),
  preferences: z.string().optional(),
  max_tokens: z.number().int().min(1).max(2048).optional(),
});

export const PoiSearchSchema = z.object({
  location: z.string().min(1, "location is required"),
  category: z.string().min(1, "category is required"),
  radius_meters: z.number().positive().optional(),
});

export const ClassifyIntentSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(2000, "Prompt is too long"),
});

export const SessionIdParamSchema = z.object({
  sessionId: z.string().regex(/^[a-zA-Z0-9_\-]{1,128}$/, "Invalid session ID format"),
});

export const ArrivalBriefingSchema = z.object({
  poiName: z.string().min(1, "poiName is required").max(256),
  distanceMeters: z.number().nonnegative(),
  entranceRoad: z.string().max(256).optional(),
  vacantBays: z.number().int().optional(),
  parkingLevel: z.string().max(64).optional(),
});

export const IssueProofOfPresenceSchema = z.object({
  subjectId: z.string().min(1, "subjectId is required"),
  targetCoordinate: CoordinatesSchema,
  geofenceRadiusMeters: z.number().positive("geofenceRadiusMeters must be positive"),
  actualObservedCoordinate: CoordinatesSchema,
  rawBreadcrumbs: z.array(z.any()).optional(),
});

export const VerifyProofOfPresenceSchema = z.object({
  attestationId: z.string().min(1, "attestationId is required"),
  subjectId: z.string().min(1, "subjectId is required"),
  targetCoordinate: CoordinatesSchema,
  geofenceRadiusMeters: z.number().positive(),
  actualObservedCoordinate: CoordinatesSchema,
  distanceFromCentroidMeters: z.number().optional(),
  rawBreadcrumbHash: z.string().min(1, "rawBreadcrumbHash is required"),
  issuedAt: z.number(),
  expiresAt: z.number(),
  signature: z.string().min(1, "signature is required"),
});

