import { spawn, ChildProcess } from "child_process";
import path from "path";
import { config } from "../config";
import { ChatRequest, NavigationRequest, LlmResponse, ModelHealth } from "../types";

let pythonServerProcess: ChildProcess | null = null;
let isStartingServer = false;

export class LlmService {
  private static apiUrl = config.gemma.apiUrl;

  /**
   * Check if the Gemma LLM server is up and model is ready.
   */
  public static async getHealth(): Promise<ModelHealth> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${this.apiUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          status: data.is_ready ? "ready" : "loading",
          model: data.model || "Gemma 3 1B",
          service: data.service || "B Map AI Inference Service",
          is_ready: Boolean(data.is_ready),
        };
      }
      return {
        status: "error",
        model: "Gemma 3 1B",
        service: "B Map AI Inference Service",
        is_ready: false,
        error: `Server responded with status ${res.status}`,
      };
    } catch (err: any) {
      return {
        status: "offline",
        model: "Gemma 3 1B",
        service: "B Map AI Inference Service",
        is_ready: false,
        error: err.name === "AbortError" ? "Health check timed out" : err.message,
      };
    }
  }

  /**
   * Automatically start the Gemma 3 Python inference server if not running.
   */
  public static async startServer(): Promise<{ started: boolean; message: string }> {
    const health = await this.getHealth();
    if (health.is_ready || health.status === "loading") {
      return { started: false, message: `Model server is already ${health.status}.` };
    }

    if (isStartingServer) {
      return { started: false, message: "Server startup is already in progress." };
    }

    isStartingServer = true;
    const pythonExe = config.gemma.pythonPath;
    const scriptPath = path.join(config.gemma.gemmaDir, "bmap_llm_server.py");

    console.log(`[B Map AI] Spawning Gemma LLM inference server:`);
    console.log(`  Python: ${pythonExe}`);
    console.log(`  Script: ${scriptPath}`);

    try {
      pythonServerProcess = spawn(pythonExe, ["bmap_llm_server.py"], {
        cwd: config.gemma.gemmaDir,
        env: {
          ...process.env,
          DATABASE_URL: config.databaseUrl,
          GEMMA_PORT: config.gemma.port.toString(),
          GEMMA_HOST: config.gemma.host,
          TF_ENABLE_ONEDNN_OPTS: "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      pythonServerProcess.stdout?.on("data", (chunk) => {
        const line = chunk.toString().trim();
        if (line) console.log(`[Gemma-Py] ${line}`);
      });

      pythonServerProcess.stderr?.on("data", (chunk) => {
        const line = chunk.toString().trim();
        if (line) console.warn(`[Gemma-Py:stderr] ${line}`);
      });

      pythonServerProcess.on("exit", (code, signal) => {
        console.warn(`[B Map AI] Gemma server process exited with code ${code}, signal: ${signal}`);
        pythonServerProcess = null;
        isStartingServer = false;
      });

      // Poll until ready or timeout after 90 seconds
      const startTime = Date.now();
      const maxWaitMs = 90_000;

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 2000));
        const currentHealth = await this.getHealth();
        if (currentHealth.is_ready) {
          isStartingServer = false;
          return { started: true, message: "Gemma model loaded and ready to serve." };
        }
      }

      isStartingServer = false;
      return {
        started: true,
        message: "Server started but model is still loading weights into memory in the background.",
      };
    } catch (err: any) {
      isStartingServer = false;
      throw new Error(`Failed to spawn Gemma server: ${err.message}`);
    }
  }

  /**
   * Stop the running child Gemma Python inference server process if started by Node.js.
   */
  public static stopServer(): void {
    if (pythonServerProcess) {
      console.log("[B Map AI] Terminating child Gemma LLM Python process...");
      try {
        pythonServerProcess.kill();
      } catch (err: any) {
        console.warn(`[B Map AI] Error killing child process: ${err.message}`);
      }
      pythonServerProcess = null;
    }
  }

  /**
   * Wait until the Gemma LLM server reports ready.
   */
  public static async waitForReady(maxWaitMs: number = 90_000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const health = await this.getHealth();
      if (health.is_ready) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  }

  /**
   * Execute chat request against Gemma server.
   */
  public static async chat(request: ChatRequest): Promise<LlmResponse> {
    const health = await this.getHealth();
    if (health.status === "offline") {
      if (config.gemma.autoStart) {
        console.log("[B Map AI] Server offline. Attempting auto-start...");
        await this.startServer();
      } else {
        throw new Error("Gemma LLM server is offline. Please start bmap_llm_server.py");
      }
    }

    const response = await fetch(`${this.apiUrl}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemma LLM error (${response.status}): ${errBody}`);
    }

    const data = (await response.json()) as LlmResponse;

    // Asynchronously log to Neon PostgreSQL
    try {
      const { PostgresManager } = require("../config/postgres");
      PostgresManager.query(
        `INSERT INTO llm_inference_logs (
           model, prompt, response, thought_process, thinking_tokens,
           latency_ms, deep_thinking_enabled, knowledge_grounded, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          data.model || "Gemma 3 1B",
          request.prompt,
          data.response,
          data.thought_process || null,
          data.thinking_tokens_estimate || 0,
          data.latency_ms || 0,
          Boolean(request.deep_thinking),
          Boolean(data.knowledge_grounded),
        ]
      ).catch(() => {});
    } catch {}

    return data;
  }

  /**
   * Execute structured navigation request against Gemma server.
   */
  public static async navigation(request: NavigationRequest): Promise<LlmResponse> {
    const health = await this.getHealth();
    if (health.status === "offline") {
      if (config.gemma.autoStart) {
        console.log("[B Map AI] Server offline. Attempting auto-start...");
        await this.startServer();
      } else {
        throw new Error("Gemma LLM server is offline. Please start bmap_llm_server.py");
      }
    }

    const response = await fetch(`${this.apiUrl}/v1/navigation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemma LLM error (${response.status}): ${errBody}`);
    }

    const data = (await response.json()) as LlmResponse;

    // Asynchronously log to Neon PostgreSQL
    try {
      const { PostgresManager } = require("../config/postgres");
      PostgresManager.query(
        `INSERT INTO llm_inference_logs (
           model, prompt, response, thought_process, thinking_tokens,
           latency_ms, deep_thinking_enabled, knowledge_grounded, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          data.model || "Gemma 3 1B",
          `${request.origin} -> ${request.destination} (${request.preferences || ""})`,
          data.response,
          data.thought_process || null,
          data.thinking_tokens_estimate || 0,
          data.latency_ms || 0,
          Boolean(request.deep_thinking),
          Boolean(data.knowledge_grounded),
        ]
      ).catch(() => {});
    } catch {}

    return data;
  }
}
