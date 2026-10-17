import { config } from "../config";

export class KeepAliveService {
  private static timer: NodeJS.Timeout | null = null;
  private static pingCount = 0;

  /**
   * Start recurring background keep-alive ping worker.
   */
  public static start(): void {
    if (!config.keepAlive.enabled) {
      console.log("[Keep-Alive] Pinger disabled by configuration.");
      return;
    }

    if (this.timer) {
      return;
    }

    const intervalMs = config.keepAlive.intervalMs || 60_000;
    const targetUrl =
      config.keepAlive.url || `http://127.0.0.1:${config.port}/ping`;

    console.log(
      `[Keep-Alive] Pinger active: pinging ${targetUrl} every ${Math.round(intervalMs / 1000)}s to prevent idle sleep.`
    );

    // Initial ping shortly after boot (5 seconds)
    const initialDelay = setTimeout(() => {
      this.ping(targetUrl);
    }, 5_000);
    if (initialDelay.unref) {
      initialDelay.unref();
    }

    // Recurring interval timer
    this.timer = setInterval(() => {
      this.ping(targetUrl);
    }, intervalMs);

    // Ensure this background timer does not prevent clean process termination
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Execute a single ping probe against target URL.
   */
  public static async ping(targetUrl: string): Promise<void> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "B-Map-AI-KeepAlive/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      this.pingCount++;

      if (response.ok) {
        console.log(
          `[Keep-Alive] Ping #${this.pingCount} OK (${response.status}) to ${targetUrl} [${latencyMs}ms]`
        );
      } else {
        console.warn(
          `[Keep-Alive] Ping #${this.pingCount} non-200 status (${response.status}) from ${targetUrl}`
        );
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const reason = err.name === "AbortError" ? "Request timeout" : err.message;
      console.warn(
        `[Keep-Alive] Ping #${this.pingCount + 1} probe note (${reason}) [${latencyMs}ms]`
      );
    }
  }

  /**
   * Gracefully stop the keep-alive timer.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[Keep-Alive] Pinger stopped.");
    }
  }
}
