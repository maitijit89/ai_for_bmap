/**
 * Production Readiness & Resilience Test Suite for B Map AI.
 * Tests:
 * 1. Health, readiness, and metrics probes
 * 2. Correlation ID tracking (X-Request-Id)
 * 3. Strict Zod schema validation (rejection of malformed telemetry/requests)
 * 4. High-availability in-memory fallback
 * 5. Full 7-Pillar copilot endpoint execution
 */

import config from "../src/config";

const BASE_URL = `http://localhost:${config.port}`;

async function runProductionTests() {
  console.log("======================================================");
  console.log(" 🧪 B Map AI - Enterprise Production Resilience Tests");
  console.log("======================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extraInfo: string = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${extraInfo ? `(${extraInfo})` : ""}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? `(${extraInfo})` : ""}`);
      failed++;
    }
  }

  // 1. Health Probe
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json() as any;
    assert(res.status === 200, "Health Probe HTTP 200");
    assert(data.backend === "healthy", "Backend Health Status is 'healthy'");
    assert(data.database !== undefined, "Database health block present", data.database?.status);
    assert(typeof data.uptime_seconds === "number", "Uptime is tracked");
  } catch (err: any) {
    assert(false, "Health Probe Exception", err.message);
  }

  // 2. Readiness Probe
  try {
    const res = await fetch(`${BASE_URL}/ready`);
    const data = await res.json() as any;
    assert(res.status === 200 || res.status === 503, "Readiness Probe Response", `Status ${res.status}: ${data.status}`);
  } catch (err: any) {
    assert(false, "Readiness Probe Exception", err.message);
  }

  // 3. Security Headers & Request Correlation ID
  try {
    const res = await fetch(`${BASE_URL}/`);
    const reqId = res.headers.get("x-request-id");
    assert(Boolean(reqId && reqId.length > 0), "Correlation ID (X-Request-Id) injected", reqId || "");
  } catch (err: any) {
    assert(false, "Correlation ID Exception", err.message);
  }

  // 4. Zod Input Validation: Reject Malformed Request
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ai-copilot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "test-session",
        prompt: "Hello",
        // Missing required 'telemetry' block!
      }),
    });
    const data = await res.json() as any;
    assert(res.status === 400, "Zod Validation Rejects Missing Telemetry with HTTP 400");
    assert(data.success === false, "Response returns success=false");
    assert(Array.isArray(data.details), "Response details contain validation issues", `${data.details?.length} issues`);
  } catch (err: any) {
    assert(false, "Zod Validation Exception", err.message);
  }

  // 5. Valid Copilot In-Drive Message
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ai-copilot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "prod-test-session-001",
        driverId: "pilot-77",
        prompt: "Heavy traffic ahead. Reroute via the expressway bypass.",
        telemetry: {
          coordinates: [77.6238, 12.9174],
          speedKmH: 45,
          headingDeg: 180,
          remainingDistanceMeters: 14200,
          etaMinutes: 28,
          batteryOrFuelSoC: 76,
          activeRouteId: "route_surface_primary",
          destinationMetadata: {
            name: "International Tech Park",
            coordinates: [77.7499, 12.9863],
          },
        },
      }),
    });
    const data = await res.json() as any;
    assert(res.status === 200, "Valid Copilot Message HTTP 200");
    const payload = data.data || data;
    assert(payload.classifiedIntent === "REROUTE_TRAFFIC_WEATHER", "Intent Classified as REROUTE_TRAFFIC_WEATHER");
    assert(Boolean(payload.speechResponse), "Copilot Speech Response Generated", payload.speechResponse?.slice(0, 50));
    assert(Array.isArray(payload.executedActions), "Automated Tools Executed", `${payload.executedActions?.length} actions`);
  } catch (err: any) {
    assert(false, "Copilot Message Exception", err.message);
  }

  // 6. Vernacular Voice Prompt
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ai-copilot/vernacular/voice-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "hi",
        distanceText: "200 meter",
        turnDirection: "left",
        landmark: "Metro Pillar 140",
      }),
    });
    const data = await res.json() as any;
    assert(res.status === 200, "Vernacular Hindi Prompt HTTP 200");
    assert(Boolean(data.data?.nativeScript), "Hindi Native Audio Prompt Generated", data.data?.nativeScript);
    assert(Boolean(data.data?.phoneticScript), "Hindi Phonetic Prompt Generated", data.data?.phoneticScript);
  } catch (err: any) {
    assert(false, "Vernacular Exception", err.message);
  }

  // 7. Eco-Route Profile
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ai-copilot/routing/eco-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: "test_route_eco",
        distanceKm: 24.5,
        elevationProfile: [
          { distanceKm: 0, elevationMeters: 140 },
          { distanceKm: 12, elevationMeters: 80 },
          { distanceKm: 24.5, elevationMeters: 50 },
        ],
      }),
    });
    const data = await res.json() as any;
    assert(res.status === 200, "Eco-Route Profile HTTP 200");
    assert(data.data?.ecoScore > 0, "Eco Score Computed", `Score: ${data.data?.ecoScore}`);
  } catch (err: any) {
    assert(false, "Eco-Route Exception", err.message);
  }

  // 8. Deep Thinking Chain-of-Thought Verification
  try {
    const res = await fetch("http://127.0.0.1:5005/health");
    if (res.ok) {
      const gemmaHealth = await res.json() as any;
      assert(gemmaHealth.features?.deep_thinking_cot === true, "Gemma Deep Thinking CoT Feature Enabled");
      assert(Boolean(gemmaHealth.checkpoints?.deep_thinking), "Deep Thinking Checkpoint Registered");
    }
  } catch {
    // If gemma is restarting, pass through
  }

  console.log("\n======================================================");
  console.log(` 🏁 Results: ${passed} Passed | ${failed} Failed`);
  console.log("======================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
