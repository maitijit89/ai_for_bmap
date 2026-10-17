/**
 * B Map AI - All-in-One Start & Bug Test Runner
 * 
 * 1. Checks and starts the Backend (Node.js/Express)
 * 2. Checks and starts the Gemma 3 LLM Model (Python/FastAPI)
 * 3. Waits until both report ONLINE and ready
 * 4. Runs the comprehensive Bug Test Suite
 * 5. Reports results cleanly
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";
import config from "../src/config";
import { LlmService } from "../src/services/llm.service";
import { runBugTestSuite } from "../src/diagnostics/bug-tester";

const BACKEND_URL = `http://localhost:${config.port}`;
const LLM_URL = config.gemma.apiUrl;

let backendProc: ChildProcess | null = null;
let llmProc: ChildProcess | null = null;

async function isBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function isLlmOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${LLM_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json() as any;
    return Boolean(data.is_ready);
  } catch {
    return false;
  }
}

async function main() {
  console.log("==================================================================");
  console.log(" 🚀 B MAP AI - START BACKEND + START LLM + RUN BUG TEST RUNNER");
  console.log("==================================================================");

  // 1. Check or start Backend
  const backendAlreadyRunning = await isBackendOnline();
  if (backendAlreadyRunning) {
    console.log(`[Backend] Node.js server already online at ${BACKEND_URL}`);
  } else {
    console.log(`[Backend] Launching backend server on port ${config.port}...`);
    backendProc = spawn("npx", ["tsx", "src/index.ts"], {
      cwd: path.resolve(__dirname, ".."),
      shell: true,
      stdio: "inherit",
      env: { ...process.env, AUTO_START_GEMMA: "true", RUN_BUG_TEST: "false" },
    });

    // Wait for backend to come online
    const startBackendWait = Date.now();
    while (Date.now() - startBackendWait < 30_000) {
      if (await isBackendOnline()) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 2. Check or start Gemma LLM Server
  const llmAlreadyRunning = await isLlmOnline();
  if (llmAlreadyRunning) {
    console.log(`[Gemma LLM] Inference server already online at ${LLM_URL}`);
  } else {
    console.log(`[Gemma LLM] Launching Gemma 3 1B inference engine on port ${config.gemma.port}...`);
    const startRes = await LlmService.startServer();
    console.log(`[Gemma LLM] Startup progress: ${startRes.message}`);

    console.log(`[Gemma LLM] Awaiting model weights and JIT sampler warm-up...`);
    const ready = await LlmService.waitForReady(90_000);
    if (!ready) {
      console.warn(`[Gemma LLM] Warning: LLM is still loading weights into memory...`);
    } else {
      console.log(`[Gemma LLM] Gemma 3 1B model is fully ready!`);
    }
  }

  // 3. Run Bug Test Suite
  console.log("\n==================================================================");
  console.log(" 🧪 EXECUTING COMPREHENSIVE PRODUCTION BUG TEST SUITE");
  console.log("==================================================================");

  const bugResult = await runBugTestSuite({ exitOnError: false });

  // Cleanup child processes if we spawned them
  if (backendProc) {
    console.log("[Cleanup] Stopping spawned backend process...");
    try {
      (backendProc as ChildProcess).kill();
    } catch {}
  }

  process.exit(bugResult.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL Runner Error:", err);
  if (backendProc) {
    try {
      (backendProc as ChildProcess).kill();
    } catch {}
  }
  process.exit(1);
});
