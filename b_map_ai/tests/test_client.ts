/**
 * End-to-end integration test client for B Map AI general navigation endpoints.
 */

async function runTests() {
  const baseUrl = "http://localhost:3000";
  console.log("==================================================");
  console.log("🧪 Testing B Map AI Endpoints");
  console.log("==================================================");

  // 1. Health check
  console.log("\n[Test 1] Checking Model Status...");
  const statusRes = await fetch(`${baseUrl}/api/model/status`);
  const statusData = await statusRes.json();
  console.log("Status response:", JSON.stringify(statusData, null, 2));

  // 2. Chat Query
  console.log("\n[Test 2] Testing Conversational Chat...");
  const chatRes = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Hello B Map AI! What can you help me with regarding city navigation?",
      max_tokens: 60,
    }),
  });
  const chatData = await chatRes.json();
  console.log("Chat response:", JSON.stringify(chatData, null, 2));

  // 3. Navigation Route Plan
  console.log("\n[Test 3] Testing Navigation Route Plan...");
  const navRes = await fetch(`${baseUrl}/api/navigation/route-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: "Central Park South, NYC",
      destination: "Times Square, NYC",
      travel_mode: "walking",
      preferences: "scenic pedestrian path, pedestrian crosswalks",
      max_tokens: 120,
    }),
  });
  const navData = await navRes.json();
  console.log("Route plan response:", JSON.stringify(navData, null, 2));

  // 4. POI Search
  console.log("\n[Test 4] Testing POI Recommendation...");
  const poiRes = await fetch(`${baseUrl}/api/navigation/poi-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "Times Square",
      category: "coffee shops and rest stops",
      radius_meters: 500,
    }),
  });
  const poiData = await poiRes.json();
  console.log("POI response:", JSON.stringify(poiData, null, 2));

  console.log("\n==================================================");
  console.log("✅ All B Map AI tests completed successfully!");
  console.log("==================================================");
}

runTests().catch(console.error);
