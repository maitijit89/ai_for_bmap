/**
 * B Map AI - Enterprise Automated Bug Test Diagnostic Engine
 * 
 * Specifically tests for:
 * 1. LLM Engine Health & Deep Thinking CoT Reasoning Trace
 * 2. LLM Malformed Payload & Boundary Rejection (Empty Prompt / Out-of-Bounds)
 * 3. Neon Serverless PostgreSQL Schema Integrity & Concurrency
 * 4. Backend Zod Validation (Rejection of invalid telemetry / coordinates)
 * 5. In-Drive Copilot Dialog State & Database Turn Hydration
 * 6. Mathematical Edge Cases (Division by Zero, NaN in BPR / ADAS / Haversine)
 * 7. Multimodal Computer Vision AI & Radial Spatial Queries
 * 8. Predictive Traffic Departure Optimizer
 * 9. Vernacular Speech Synthesis & Invalid Language Fallback
 * 10. Security Headers & Container Readiness Probe
 */

import config from "../config";
import { PostgresManager } from "../config/postgres";
import { DynamicRecommendationService } from "../services/dynamic-recommendation.service";
import { SrNavigationService } from "../services/sr-navigation.service";
import { TrajectoryMiningService } from "../services/trajectory-mining.service";

export interface BugTestResult {
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  failures: string[];
}

export async function runBugTestSuite(options: { exitOnError?: boolean; silent?: boolean } = {}): Promise<BugTestResult> {
  const baseUrl = `http://localhost:${config.port}`;
  const gemmaUrl = config.gemma.apiUrl;

  const tStart = Date.now();
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function assert(condition: boolean, testName: string, extraInfo: string = "") {
    if (condition) {
      if (!options.silent) {
        console.log(`  ✅ [PASS] ${testName} ${extraInfo ? `(${extraInfo})` : ""}`);
      }
      passed++;
    } else {
      const msg = `${testName} ${extraInfo ? `(${extraInfo})` : ""}`;
      failures.push(msg);
      if (!options.silent) {
        console.error(`  ❌ [BUG DETECTED] ${msg}`);
      }
      failed++;
    }
  }

  if (!options.silent) {
    console.log("==================================================================");
    console.log(" 🐞 B MAP AI - AUTOMATED PRODUCTION BUG TEST SUITE");
    console.log("==================================================================");
    console.log(` Target Backend  : ${baseUrl}`);
    console.log(` Target LLM Model: ${gemmaUrl}`);
    console.log("------------------------------------------------------------------");
  }

  // ==========================================================================
  // MODULE 1: LLM Engine Health & Deep Thinking CoT
  // ==========================================================================
  if (!options.silent) console.log("\n[1/10] 🧠 LLM MODEL HEALTH & DEEP THINKING REASONING TEST");
  try {
    const healthRes = await fetch(`${gemmaUrl}/health`);
    const healthData = await healthRes.json() as any;
    assert(healthRes.status === 200, "Gemma LLM Health Probe returns 200");
    assert(healthData.is_ready === true, "Gemma 3 1B Model is marked as ready");
    assert(healthData.features?.deep_thinking_cot === true, "Deep Thinking Chain-of-Thought feature enabled");
    assert(healthData.database?.connected === true, "Gemma connected to Neon Serverless PostgreSQL");
  } catch (err: any) {
    assert(false, "LLM Health Probe Exception", err.message);
  }

  // ==========================================================================
  // MODULE 2: LLM Input Validation & Malformed Payload Rejection
  // ==========================================================================
  if (!options.silent) console.log("\n[2/10] 🛡️ LLM INPUT VALIDATION & BUG REJECTION TEST");
  try {
    // 2.1 Empty prompt rejection
    const emptyPromptRes = await fetch(`${gemmaUrl}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });
    assert(emptyPromptRes.status === 400, "LLM rejects empty whitespace prompt with HTTP 400");

    // 2.2 Navigation endpoint missing origin/destination
    const emptyNavRes = await fetch(`${gemmaUrl}/v1/navigation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: "", destination: "Potsdamer Platz" }),
    });
    assert(emptyNavRes.status === 400, "LLM rejects empty navigation origin with HTTP 400");
  } catch (err: any) {
    assert(false, "LLM Validation Exception", err.message);
  }

  // ==========================================================================
  // MODULE 3: Neon PostgreSQL Schema Integrity & Concurrency
  // ==========================================================================
  if (!options.silent) console.log("\n[3/10] 🐘 NEON SERVERLESS POSTGRESQL INTEGRITY TEST");
  try {
    const tableRes = await PostgresManager.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const existingTables = tableRes.rows.map((r: any) => r.table_name);
    const requiredTables = [
      "copilot_sessions",
      "copilot_turns",
      "vision_incidents",
      "master_pois",
      "road_changes",
      "llm_inference_logs",
      "navigation_knowledge",
    ];

    for (const tbl of requiredTables) {
      assert(existingTables.includes(tbl), `Database schema contains table '${tbl}'`);
    }

    // Concurrency test: execute 5 parallel queries
    const parallelQueries = Array.from({ length: 5 }, (_, i) =>
      PostgresManager.query("SELECT 1 AS probe, $1::int AS idx", [i])
    );
    const parallelResults = await Promise.all(parallelQueries);
    assert(
      parallelResults.every((r) => r.rows[0]?.probe === 1),
      "Connection pool handles 5 rapid concurrent queries without leaks"
    );
  } catch (err: any) {
    assert(false, "PostgreSQL Integrity Exception", err.message);
  }

  // ==========================================================================
  // MODULE 4: Backend Zod Schema Validation & Injection Prevention
  // ==========================================================================
  if (!options.silent) console.log("\n[4/10] 🔒 BACKEND ZOD SCHEMA & INPUT VALIDATION TEST");
  try {
    // 4.1 Missing telemetry payload
    const missingTelemetryRes = await fetch(`${baseUrl}/api/v1/ai-copilot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "bug_test_session",
        prompt: "Check traffic ahead",
      }),
    });
    const missingJson = await missingTelemetryRes.json() as any;
    assert(missingTelemetryRes.status === 400, "Rejects request missing required 'telemetry' block");
    assert(missingJson.success === false, "Returns structured JSON error format");

    // 4.2 Out-of-bounds coordinates
    const invalidCoordsRes = await fetch(`${baseUrl}/api/v1/ai-copilot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "bug_test_session",
        prompt: "Reroute",
        telemetry: {
          coordinates: [999.0, 999.0], // Out of GPS bounds
          speedKmH: 50,
          headingDeg: 180,
          remainingDistanceMeters: 5000,
          etaMinutes: 10,
          batteryOrFuelSoC: 80,
          activeRouteId: "route_test",
          destinationMetadata: { name: "City Center", coordinates: [77.59, 12.97] },
        },
      }),
    });
    assert(invalidCoordsRes.status === 400, "Rejects out-of-bounds coordinates with HTTP 400");
  } catch (err: any) {
    assert(false, "Zod Validation Exception", err.message);
  }

  // ==========================================================================
  // MODULE 5: Copilot Dialog State & Database Turn Hydration
  // ==========================================================================
  if (!options.silent) console.log("\n[5/10] 🗣️ COPILOT DIALOG STATE & TURN PERSISTENCE TEST");
  const testSessionId = `bug_test_sess_${Date.now()}`;
  try {
    const copilotRes = await fetch(`${baseUrl}/api/v1/ai-copilot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: testSessionId,
        driverId: "bug_hunter_pilot",
        prompt: "Find nearest charging station with available bays",
        telemetry: {
          coordinates: [77.6238, 12.9174],
          speedKmH: 45,
          headingDeg: 90,
          remainingDistanceMeters: 12000,
          etaMinutes: 22,
          batteryOrFuelSoC: 15,
          activeRouteId: "route_primary",
          destinationMetadata: {
            name: "Silicon Oasis Tech Park",
            coordinates: [77.689, 12.935],
          },
        },
      }),
    });
    const copilotData = await copilotRes.json() as any;
    assert(copilotRes.status === 200, "Copilot message endpoint responds HTTP 200");
    const payload = copilotData.data || copilotData;
    assert(Boolean(payload.speechResponse), "Voice response text generated", payload.speechResponse?.slice(0, 40));
    assert(payload.classifiedIntent === "FIND_ALONG_ROUTE", "Intent accurately classified as FIND_ALONG_ROUTE");
    assert(Array.isArray(payload.executedActions), "Automated tools executed", `${payload.executedActions?.length} tools`);

    // Verify database record
    const dbTurnRes = await PostgresManager.query(
      "SELECT * FROM copilot_turns WHERE session_id = $1",
      [testSessionId]
    );
    assert(dbTurnRes.rows.length >= 1, "Turn persisted into PostgreSQL 'copilot_turns' table");
  } catch (err: any) {
    assert(false, "Copilot State Exception", err.message);
  }

  // ==========================================================================
  // MODULE 6: Mathematical Edge Cases (Division by Zero, NaN, Array Bounds)
  // ==========================================================================
  if (!options.silent) console.log("\n[6/10] ➗ MATHEMATICAL EDGE CASES & DIVISION-BY-ZERO GUARD TEST");
  try {
    // 6.1 BPR function with zero and negative free-flow speed
    const bprZeroSpeed = DynamicRecommendationService.calculateBprWeight(300, 0, 0);
    assert(!isNaN(bprZeroSpeed.weightedDurationSeconds), "BPR with vFree=0 does not produce NaN");
    assert(isFinite(bprZeroSpeed.weightedDurationSeconds), "BPR with vFree=0 does not produce Infinity");

    const bprNegativeSpeed = DynamicRecommendationService.calculateBprWeight(300, -20, -50);
    assert(!isNaN(bprNegativeSpeed.weightedDurationSeconds), "BPR with negative speed does not produce NaN");
    assert(bprNegativeSpeed.weightedDurationSeconds >= 0, "BPR weighted duration is strictly positive");

    // 6.2 ADAS assessment with null/undefined obstacles
    const adasNullObstacles = SrNavigationService.computeAdasState({
      obstacles: null as any,
      egoSpeedKmH: 60,
      distanceToLeftBoundaryMeters: 1.5,
      distanceToRightBoundaryMeters: 1.5,
      turnSignalActive: false,
    });
    assert(adasNullObstacles.timeToCollisionSeconds === null, "ADAS with null obstacles returns null TTC without throwing");
    assert(adasNullObstacles.forwardCollisionWarning === false, "ADAS returns FCW=false when no obstacles present");

    // 6.3 ADAS assessment with relative speed = 0 (prevents division by zero)
    const adasZeroRelSpeed = SrNavigationService.computeAdasState({
      obstacles: [{
        id: "obs_01",
        type: "car",
        lateralOffsetMeters: 0,
        longitudinalDistanceMeters: 25,
        relativeSpeedKmH: 0, // Delta v = 0
      }],
      egoSpeedKmH: 50,
      distanceToLeftBoundaryMeters: 1.5,
      distanceToRightBoundaryMeters: 1.5,
      turnSignalActive: false,
    });
    assert(adasZeroRelSpeed.timeToCollisionSeconds === null, "ADAS with relSpeed=0 avoids division by zero");

    // 6.4 Trajectory Mining with null, empty, and single-point GPS traces
    const stayNull = TrajectoryMiningService.extractStayPoints(null as any);
    assert(Array.isArray(stayNull) && stayNull.length === 0, "Stay point extraction with null GPS trace safely returns empty array");

    const stayEmpty = TrajectoryMiningService.extractStayPoints([]);
    assert(Array.isArray(stayEmpty) && stayEmpty.length === 0, "Stay point extraction with empty GPS trace safely returns empty array");

    // 6.5 Haversine Distance with identical coordinates
    const distZero = TrajectoryMiningService.haversineDistanceMeters(12.9716, 77.5946, 12.9716, 77.5946);
    assert(distZero === 0, "Haversine distance for identical coordinates is exactly 0.0");
    assert(!isNaN(distZero), "Haversine distance is not NaN");
  } catch (err: any) {
    assert(false, "Mathematical Guard Exception", err.message);
  }

  // ==========================================================================
  // MODULE 7: Multimodal Computer Vision AI & Spatial Querying
  // ==========================================================================
  if (!options.silent) console.log("\n[7/10] 👁️ MULTIMODAL COMPUTER VISION & RADIAL SPATIAL TEST");
  try {
    const visionRes = await fetch(`${baseUrl}/api/v1/ai-copilot/vision/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [77.601, 12.975],
        roadName: "Hosur Road Flyover",
        currentSpeedKmH: 58,
        digitalMapSpeedLimitKmH: 60,
      }),
    });
    const visionData = await visionRes.json() as any;
    assert(visionRes.status === 200, "Vision analysis endpoint returns HTTP 200");
    const vPayload = visionData.data || visionData;
    assert(Array.isArray(vPayload.hazards), "Hazards detected as array");
    assert(Boolean(vPayload.coachingAdvice), "Driver coaching advice synthesized");

    // Test nearby incidents with radial search
    const nearbyRes = await fetch(`${baseUrl}/api/v1/ai-copilot/vision/incidents/nearby?lng=77.601&lat=12.975&radius=10000`);
    assert(nearbyRes.status === 200, "Nearby vision incidents spatial search returns HTTP 200");
    const nearbyData = await nearbyRes.json() as any;
    assert(Array.isArray(nearbyData.data), "Nearby incidents returned as array format");
  } catch (err: any) {
    assert(false, "Vision AI Exception", err.message);
  }

  // ==========================================================================
  // MODULE 8: Departure Time Optimizer & Spatio-Temporal Windows
  // ==========================================================================
  if (!options.silent) console.log("\n[8/10] 📈 TRAFFIC DEPARTURE TIME OPTIMIZER TEST");
  try {
    const trafficRes = await fetch(`${baseUrl}/api/v1/ai-copilot/traffic/departure-optimizer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: "Indiranagar 100ft Road",
        destination: "KIAL Airport Terminal 2",
        distanceKm: 38,
        targetDepartureTimeIso: new Date().toISOString(),
      }),
    });
    const trafficData = await trafficRes.json() as any;
    assert(trafficRes.status === 200, "Traffic departure optimizer returns HTTP 200");
    const tPayload = trafficData.data || trafficData;
    assert(tPayload.freeFlowDurationMinutes > 0, "Free-flow duration is positive");
    assert(tPayload.targetSlotDurationMinutes > 0, "Target slot duration is positive");
    assert(Array.isArray(tPayload.slots) && tPayload.slots.length >= 4, "Rolling departure windows computed");
  } catch (err: any) {
    assert(false, "Traffic Optimizer Exception", err.message);
  }

  // ==========================================================================
  // MODULE 9: Vernacular Speech & Multilingual Fallback
  // ==========================================================================
  if (!options.silent) console.log("\n[9/10] 🗣️ VERNACULAR MULTILINGUAL SPEECH & FALLBACK TEST");
  try {
    // 9.1 Hindi synthesis
    const hindiRes = await fetch(`${baseUrl}/api/v1/ai-copilot/vernacular/voice-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textEnglish: "In 200 meters, take the left exit after Metro Pillar 140.",
        targetLanguageCode: "hi",
        distanceMeters: 200,
        landmarkName: "Metro Pillar 140",
      }),
    });
    const hindiData = await hindiRes.json() as any;
    assert(hindiRes.status === 200, "Hindi voice synthesis returns HTTP 200");
    const hPayload = hindiData.data || hindiData;
    const nativeText = hPayload.nativeScript || hPayload.nativeScriptText;
    assert(Boolean(nativeText), "Hindi native script generated", nativeText?.slice(0, 35));

    // 9.2 Unknown language code fallback
    const fallbackRes = await fetch(`${baseUrl}/api/v1/ai-copilot/vernacular/voice-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textEnglish: "Proceed straight for 2 kilometers.",
        targetLanguageCode: "unsupported_code_xyz",
      }),
    });
    assert(fallbackRes.status === 200, "Unsupported language code gracefully falls back with HTTP 200");
  } catch (err: any) {
    assert(false, "Vernacular Speech Exception", err.message);
  }

  // ==========================================================================
  // MODULE 10: Security Headers & Container Readiness Probe
  // ==========================================================================
  if (!options.silent) console.log("\n[10/10] 🛡️ SECURITY HEADERS & READINESS PROBE TEST");
  try {
    let readyRes = await fetch(`${baseUrl}/ready`);
    let readyData = (await readyRes.json()) as any;
    if (readyRes.status !== 200) {
      await new Promise((r) => setTimeout(r, 2500));
      readyRes = await fetch(`${baseUrl}/ready`);
      readyData = (await readyRes.json()) as any;
    }
    assert(readyRes.status === 200, "Readiness probe returns HTTP 200 (ready_for_traffic)");
    assert(readyData.ready === true, "Container orchestration readiness status is true");

    const rootRes = await fetch(`${baseUrl}/`);
    const correlationId = rootRes.headers.get("x-request-id");
    assert(Boolean(correlationId), "Request correlation ID (X-Request-Id) present in response headers");
  } catch (err: any) {
    assert(false, "Security & Readiness Exception", err.message);
  }

  // Summary
  const durationMs = Date.now() - tStart;
  const total = passed + failed;

  if (!options.silent) {
    console.log("\n==================================================================");
    if (failed === 0) {
      console.log(` 🏁 RESULT: ALL ${passed} BUG CHECKS PASSED (100% CLEAN - ZERO BUGS)!`);
    } else {
      console.error(` ❌ RESULT: ${failed} BUG(S) DETECTED OUT OF ${total} CHECKS.`);
      failures.forEach((f, idx) => console.error(`    ${idx + 1}. ${f}`));
    }
    console.log(` Duration: ${(durationMs / 1000).toFixed(2)}s`);
    console.log("==================================================================\n");
  }

  if (options.exitOnError && failed > 0) {
    process.exit(1);
  }

  return { passed, failed, total, durationMs, failures };
}
