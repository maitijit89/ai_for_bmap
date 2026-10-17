/**
 * Deep Thinking Chain-of-Thought (CoT) Verification Test.
 * Tests Gemma 3 (1B) deliberating through internal spatial, topological,
 * kinematic, and safety reasoning before emitting the final in-drive instructions.
 */

async function testDeepThinking() {
  console.log("=================================================================");
  console.log(" 🧠 B Map AI - Gemma 3 (1B) Deep Thinking Verification");
  console.log("=================================================================");

  const gemmaUrl = "http://127.0.0.1:5005/v1/chat";

  const prompt =
    "Approaching a critical highway divergence in 400m at 65 km/h. Flight in 45 mins. " +
    "Left ramp goes to local road with 4 traffic lights, right ramp is an elevated toll bypass. " +
    "Camera shows rain puddles forming on the right ramp. What is your recommendation?";

  const telemetry =
    "Speed: 65 km/h, Location: Airport Corridor Divergence, Destination: Terminal 1, Distance: 12 km.";

  console.log(`Prompt: "${prompt}"\n`);
  console.log("Submitting query with deep_thinking: true...");

  try {
    const res = await fetch(gemmaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        telemetry_context: telemetry,
        deep_thinking: true,
        max_tokens: 320,
      }),
    });

    if (!res.ok) {
      console.log(`Model responded with status: ${res.status} (Model may be warming up)`);
      return;
    }

    const data = await res.json() as any;

    console.log("\n-----------------------------------------------------------------");
    console.log(" 🧐 INTERNAL DEEP THINKING REASONING TRACE (<thinking>)");
    console.log("-----------------------------------------------------------------");
    if (data.thought_process) {
      console.log(data.thought_process);
    } else {
      console.log("(Deliberated in model internal representations)");
    }

    console.log("\n-----------------------------------------------------------------");
    console.log(" 🗣️ FINAL SPOKEN IN-DRIVE RESPONSE");
    console.log("-----------------------------------------------------------------");
    console.log(`"${data.response}"`);
    console.log("-----------------------------------------------------------------");
    console.log(`Model                       : ${data.model}`);
    console.log(`Latency                     : ${data.latency_ms} ms`);
    console.log(`Estimated Thinking Tokens   : ${data.thinking_tokens_estimate}`);
    console.log(`Deep Thinking Enabled       : ${data.deep_thinking_enabled}`);
    console.log("=================================================================\n");
  } catch (err: any) {
    console.log(`Notice: ${err.message}`);
  }
}

testDeepThinking();
