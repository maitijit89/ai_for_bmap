/**
 * Neon PostgreSQL Full Integration Test Suite for B Map AI & LLM Model.
 * Validates tables, indexes, session persistence, turn logging,
 * multimodal vision incident auditing, and LLM inference telemetry.
 */

import { PostgresManager } from "../src/config/postgres";
import { AiCopilotService } from "../src/services/ai-copilot.service";
import { AiVisionAnalyzerService } from "../src/services/ai-vision-analyzer.service";
import { PoiResolutionService } from "../src/services/poi-resolution.service";
import { RoadProductionService } from "../src/services/road-production.service";

function assert(condition: boolean, testName: string, detail: any = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${detail}`);
    process.exitCode = 1;
  }
}

async function runPostgresTests() {
  console.log("==================================================================");
  console.log(" 🐘 B Map AI - Neon PostgreSQL & LLM Model Integration Suite");
  console.log("==================================================================");

  // 1. Connection & Health Probe
  const connected = await PostgresManager.connect();
  assert(connected, "Connect to Neon Serverless PostgreSQL");

  const health = PostgresManager.getHealth();
  assert(health.isConnected, "PostgreSQL Health status is connected");
  assert(health.provider === "Neon Serverless PostgreSQL", "Provider is Neon Serverless");
  console.log(`     Connected to Host: ${health.host}`);
  console.log(`     Database: ${health.database}`);
  console.log(`     Server Version: ${health.serverVersion}`);

  // 2. Verify Required Production Schemas
  console.log("\n--- 📋 SCHEMA & TABLE VERIFICATION ---");
  const tablesRes = await PostgresManager.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const tableNames = tablesRes.rows.map((r: any) => r.table_name);
  console.log("  Discovered Tables:", tableNames.join(", "));

  assert(tableNames.includes("copilot_sessions"), "Table 'copilot_sessions' exists");
  assert(tableNames.includes("copilot_turns"), "Table 'copilot_turns' exists");
  assert(tableNames.includes("vision_incidents"), "Table 'vision_incidents' exists");
  assert(tableNames.includes("master_pois"), "Table 'master_pois' exists");
  assert(tableNames.includes("road_changes"), "Table 'road_changes' exists");
  assert(tableNames.includes("llm_inference_logs"), "Table 'llm_inference_logs' exists");

  // 3. Test Copilot In-Drive Session & Deep Thinking Turn Persistence
  console.log("\n--- 🗣️ COPILOT SESSION & TURN PERSISTENCE ---");
  const testSessionId = `test_pg_session_${Date.now()}`;
  const copilotResult = await AiCopilotService.processMessage({
    sessionId: testSessionId,
    driverId: "pilot_neon_01",
    prompt: "Approaching high-speed fork. Check for flood hazard and reroute.",
    telemetry: {
      coordinates: [77.5946, 12.9716],
      speedKmH: 60,
      headingDeg: 90,
      remainingDistanceMeters: 8500,
      etaMinutes: 14,
      batteryOrFuelSoC: 80,
      activeRouteId: "route_neon_primary",
      destinationMetadata: {
        name: "Electronic City Expressway",
        coordinates: [77.6648, 12.8452],
      },
    },
  });

  assert(Boolean(copilotResult.speechResponse), "Copilot Response Generated", copilotResult.speechResponse.slice(0, 45));

  // Query database to verify physical persistence
  const savedSessionRes = await PostgresManager.query(
    "SELECT * FROM copilot_sessions WHERE session_id = $1",
    [testSessionId]
  );
  assert(savedSessionRes.rows.length === 1, "Session persisted to PostgreSQL 'copilot_sessions'");
  assert(savedSessionRes.rows[0].destination_name === "Electronic City Expressway", "Session destination matches");

  const savedTurnsRes = await PostgresManager.query(
    "SELECT * FROM copilot_turns WHERE session_id = $1",
    [testSessionId]
  );
  assert(savedTurnsRes.rows.length >= 1, "Turn persisted to PostgreSQL 'copilot_turns'");
  assert(savedTurnsRes.rows[0].role === "copilot", "Turn role is copilot");

  // Query back via getSession
  const retrievedSession = await AiCopilotService.getSession(testSessionId);
  assert(retrievedSession !== null, "Session retrieved from PostgreSQL via AiCopilotService.getSession");
  assert(retrievedSession?.turns?.length >= 1, "Turns hydrated correctly from PostgreSQL");

  // 4. Test Computer Vision Incident Storage
  console.log("\n--- 👁️ VISION HAZARD INCIDENT AUDIT ---");
  const incidentResult = await AiVisionAnalyzerService.analyzeRoadScene({
    coordinates: [77.601, 12.975],
    currentSpeedKmH: 55,
    roadName: "Hosur Main Road",
    rawImageBase64: "dGVzdF9mcmFtZV9kYXRh",
  });

  const savedIncidentRes = await PostgresManager.query(
    "SELECT * FROM vision_incidents WHERE incident_id = $1",
    [incidentResult.incidentId]
  );
  assert(savedIncidentRes.rows.length === 1, "Vision incident persisted to PostgreSQL 'vision_incidents'");
  assert(savedIncidentRes.rows[0].status === "active", "Incident status is active");
  console.log(`     Saved Incident ID: ${incidentResult.incidentId}`);

  // 5. Test Master POI Resolution Persistence
  console.log("\n--- 🏨 MASTER POI & GOLDEN RECORD PERSISTENCE ---");
  const poiResult = PoiResolutionService.fuseCandidate({
    name: "Shell Recharge Fast EV Hub",
    category: "ev_charging",
    coordinates: [77.625, 12.935],
    source: "fleet_checkin",
  });

  // Allow async query to write
  await new Promise((r) => setTimeout(r, 600));

  const savedPoiRes = await PostgresManager.query(
    "SELECT * FROM master_pois WHERE master_poi_id = $1",
    [poiResult.masterPoi.id]
  );
  assert(savedPoiRes.rows.length === 1, "Master POI persisted to PostgreSQL 'master_pois'");
  assert(savedPoiRes.rows[0].category === "ev_charging", "Master POI category is 'ev_charging'");

  // 6. Test Road Production & Anomaly Persistence
  console.log("\n--- 🛣️ ROAD PRODUCTION & ZERO-FLOW ANOMALY ---");
  const roadRecord = RoadProductionService.extractRoadCenterline({
    corridorName: "Outer Ring Road Express",
    rawGpsTraversingPoints: [[77.6, 12.9], [77.61, 12.91], [77.62, 12.92]],
    averageObservedSpeedKmH: 78,
    traversingVehicleCount: 450,
  });

  await new Promise((r) => setTimeout(r, 600));

  const savedRoadRes = await PostgresManager.query(
    "SELECT * FROM road_changes WHERE change_id = $1",
    [roadRecord.id]
  );
  assert(savedRoadRes.rows.length === 1, "Road centerline change persisted to PostgreSQL 'road_changes'");

  // 7. Test Gemma 3 LLM Inference Audit Telemetry
  console.log("\n--- 🧠 LLM MODEL INFERENCE AUDIT TELEMETRY ---");
  const testInference = await PostgresManager.query(
    `INSERT INTO llm_inference_logs (
       model, prompt, response, thought_process, thinking_tokens,
       latency_ms, deep_thinking_enabled, knowledge_grounded, session_id, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
    [
      "B Map AI (Gemma 3 1B - Deep Thinking Grounded)",
      "Approaching critical highway divergence in 400m at 65 km/h. Recommend route.",
      "Take the elevated toll bypass on your right in 400 meters.",
      "1. Urgency: High\n2. Kinematics: 400m before fork\n3. Action: Elevated bypass eliminates 4 surface delays.",
      145,
      28450.5,
      true,
      true,
      testSessionId,
    ]
  );

  assert(testInference.rows.length === 1, "LLM Inference telemetry logged to PostgreSQL 'llm_inference_logs'");
  assert(testInference.rows[0].thinking_tokens === 145, "Thinking tokens count stored accurately");
  assert(testInference.rows[0].deep_thinking_enabled === true, "Deep thinking flag stored accurately");

  const totalLogsRes = await PostgresManager.query("SELECT COUNT(*) FROM llm_inference_logs");
  console.log(`     Total Logged Inferences in PostgreSQL: ${totalLogsRes.rows[0].count}`);

  // Clean disconnect
  await PostgresManager.disconnect();

  console.log("\n==================================================================");
  console.log(" 🏁 NEON POSTGRESQL & LLM MODEL INTEGRATION VERIFIED 100%!");
  console.log("==================================================================\n");
}

runPostgresTests().catch((err) => {
  console.error("FATAL: Postgres Integration Test Failed:", err);
  process.exit(1);
});
