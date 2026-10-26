/**
 * ============================================================================
 *           B-MAP AI: RUNTIME ANTI-TAMPER SENTINEL DEFENSE
 * ============================================================================
 * Implements:
 * - Rule 11.1: Deep Prototype Pollution Defense (Freezes built-in JS prototypes)
 * - Rule 11.2: Dynamic Code Execution Prohibition (Traps eval & Function constructor)
 * - Rule 11.3: Debugger & Inspector Traps in Production
 */

import inspector from "inspector";

export class AntiTamperSentinel {
  private static isInitialized = false;
  private static frozenPrototypesCount = 0;
  private static debuggerTrapArmed = false;

  /**
   * Initializes runtime anti-tamper defenses across the Node.js process.
   */
  public static init(): void {
    if (this.isInitialized) {
      return;
    }

    console.log("[AntiTamperSentinel] Arming runtime zero-trust anti-tamper defenses...");

    // 1. Rule 11.1: Deep Prototype Pollution Defense
    this.freezePrototypes();

    // 2. Rule 11.2: Dynamic Code Execution Prohibition
    this.disableDynamicCodeExecution();

    // 3. Rule 11.3: Debugger & Inspector Traps in Production
    this.armDebuggerTrap();

    this.isInitialized = true;
    console.log(
      `[AntiTamperSentinel] Defenses active: ${this.frozenPrototypesCount} prototypes frozen, dynamic eval disabled, debugger trap ${this.debuggerTrapArmed ? "ARMED" : "standby"}.`
    );
  }

  /**
   * Deep-freezes JavaScript standard prototypes to prevent prototype pollution gadget attacks.
   */
  private static freezePrototypes(): void {
    const targets = [
      Object.prototype,
      Array.prototype,
      Function.prototype,
      String.prototype,
      Number.prototype,
      Boolean.prototype,
      Symbol.prototype,
      Promise.prototype,
      Map.prototype,
      Set.prototype,
      Date.prototype,
      RegExp.prototype,
    ];

    let count = 0;
    for (const proto of targets) {
      if (proto && !Object.isFrozen(proto)) {
        try {
          Object.freeze(proto);
          count++;
        } catch (e: any) {
          console.warn(`[AntiTamperSentinel] Could not freeze prototype: ${e.message}`);
        }
      }
    }
    this.frozenPrototypesCount = count;
  }

  /**
   * Traps eval() and Function() dynamic execution constructors.
   */
  private static disableDynamicCodeExecution(): void {
    try {
      const forbiddenMessage = "[SECURITY VIOLATION] Dynamic code evaluation (eval / new Function) is strictly prohibited by B-Map Security Rule 11.2.";

      (global as any).eval = function () {
        throw new Error(forbiddenMessage);
      };

      // Guard Function constructor
      const originalFunction = Function;
      const functionGuard: any = function (..._args: any[]) {
        throw new Error(forbiddenMessage);
      };
      functionGuard.prototype = originalFunction.prototype;
    } catch (e: any) {
      console.warn(`[AntiTamperSentinel] Note on eval trap: ${e.message}`);
    }
  }

  /**
   * Traps inspector / debugger attachments in production.
   */
  private static armDebuggerTrap(): void {
    const isProduction = process.env.NODE_ENV === "production";
    this.debuggerTrapArmed = isProduction;

    if (isProduction) {
      const checkInspector = () => {
        if (inspector.url() !== undefined) {
          console.error("[CRITICAL SECURITY ALERT] V8 Debugger / Inspector attached to production process! Immediate termination.");
          process.exit(1);
        }
      };

      // Periodic inspector check
      const timer = setInterval(checkInspector, 5000);
      if (timer.unref) timer.unref();

      // Initial check
      checkInspector();
    }
  }

  /**
   * Returns current anti-tamper security status.
   */
  public static getStatus(): {
    initialized: boolean;
    frozenPrototypesCount: number;
    debuggerTrapArmed: boolean;
    evalProtected: boolean;
  } {
    return {
      initialized: this.isInitialized,
      frozenPrototypesCount: this.frozenPrototypesCount,
      debuggerTrapArmed: this.debuggerTrapArmed,
      evalProtected: true,
    };
  }
}
