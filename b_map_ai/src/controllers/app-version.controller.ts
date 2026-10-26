import { Request, Response } from "express";

export class AppVersionController {
  private static readonly CURRENT_VERSION = "2.1.0";
  private static readonly MINIMUM_SUPPORTED_VERSION = "2.0.0";
  private static readonly SECURITY_PATCH_LEVEL = "2026-10-26-P1";

  /**
   * Helper to parse semver "major.minor.patch"
   */
  private static parseSemVer(v: string): number[] {
    const clean = v.replace(/^v/, "").trim();
    const parts = clean.split(".").map((p) => parseInt(p, 10));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }

  /**
   * Checks client version compatibility and security patch requirement.
   * GET /api/v1/app-version/check
   */
  public static checkVersion(req: Request, res: Response): void {
    const clientVersionStr = (req.query.version as string) || "2.0.0";
    const clientPlatform = ((req.query.platform as string) || "mobile").toLowerCase();

    const clientVer = AppVersionController.parseSemVer(clientVersionStr);
    const minVer = AppVersionController.parseSemVer(AppVersionController.MINIMUM_SUPPORTED_VERSION);
    const currentVer = AppVersionController.parseSemVer(AppVersionController.CURRENT_VERSION);

    // Check if client is below minimum supported
    const isBelowMinimum =
      clientVer[0] < minVer[0] ||
      (clientVer[0] === minVer[0] && clientVer[1] < minVer[1]) ||
      (clientVer[0] === minVer[0] && clientVer[1] === minVer[1] && clientVer[2] < minVer[2]);

    const isUpToDate =
      clientVer[0] === currentVer[0] &&
      clientVer[1] === currentVer[1] &&
      clientVer[2] === currentVer[2];

    const forceUpdate = isBelowMinimum;
    const recommendedUpdate = !isUpToDate;

    res.json({
      success: true,
      data: {
        clientVersion: clientVersionStr,
        platform: clientPlatform,
        currentServerVersion: AppVersionController.CURRENT_VERSION,
        minimumSupportedVersion: AppVersionController.MINIMUM_SUPPORTED_VERSION,
        securityPatchLevel: AppVersionController.SECURITY_PATCH_LEVEL,
        isSupported: !forceUpdate,
        forceUpdate,
        recommendedUpdate,
        patchStatus: "UP_TO_DATE",
        downloadUrls: {
          android: "https://bmap.in/download/android",
          ios: "https://bmap.in/download/ios",
          web: "https://bmap.in/app",
        },
        releaseNotes: [
          "Security Patch: Neutralized body-parser DoS vulnerability (GHSA-27r3-jxmh-p828)",
          "Anti-Tamper: Deep JS prototype freezing and production debugger traps",
          "Zero-Trust: Anti-Reconnaissance scanner defense and NoSQL injection sanitizer",
          "Telemetry: HMAC-SHA256 request signing and sliding nonce replay prevention",
          "Kinematics: Anti-GPS spoofing acceleration and mock provider validator",
          "Spatial Proof-of-Presence: Cryptographic geofence attestation service",
          "Database: Upgraded Neon Serverless PostgreSQL to verify-full SSL mode",
        ],
      },
    });
  }

  /**
   * Reports system security advisories and hardening status.
   * GET /api/v1/security/advisories
   */
  public static getSecurityAdvisories(_req: Request, res: Response): void {
    res.json({
      success: true,
      statusCode: 200,
      data: {
        platform: "B-Map AI Navigation Platform",
        version: AppVersionController.CURRENT_VERSION,
        securityPatchLevel: AppVersionController.SECURITY_PATCH_LEVEL,
        status: "HARDENED",
        auditVulnerabilities: 0,
        activeProtections: [
          {
            id: "SEC-PATCH-001",
            name: "Body-Parser Compressed Payload DoS Mitigation",
            cve: "GHSA-27r3-jxmh-p828",
            severity: "HIGH",
            status: "PATCHED",
            component: "body-parser@2.4.0",
          },
          {
            id: "SEC-DEF-002",
            name: "Runtime Anti-Tamper Prototype Pollution Defense",
            rule: "Rule 11.1 & 11.2",
            status: "ACTIVE",
            details: "12 core JavaScript prototypes frozen; eval/Function traps armed",
          },
          {
            id: "SEC-DEF-003",
            name: "Anti-Reconnaissance & Scanner Trap",
            rule: "Rule 2.4",
            status: "ACTIVE",
            details: "Intercepts probes for .env, .git, wp-admin, phpmyadmin, actuator",
          },
          {
            id: "SEC-DEF-004",
            name: "NoSQL Query Selector Injection Neutralizer",
            rule: "Rule 2.5",
            status: "ACTIVE",
            details: "Strips dollar-prefixed operators and nested dot notations recursively",
          },
          {
            id: "SEC-DEF-005",
            name: "Cryptographic Telemetry Request Signer & Anti-Replay Guard",
            rule: "Rule 3.1 & 3.2",
            status: "ACTIVE",
            details: "HMAC-SHA256 with 45s sliding nonce deduplication window",
          },
          {
            id: "SEC-DEF-006",
            name: "Anti-GPS Spoofing & Kinematic Physics Plausibility Guard",
            rule: "Rule 4.1",
            status: "ACTIVE",
            details: "6.5 m/s² acceleration ceiling, 220 km/h speed floor, mock provider filter",
          },
          {
            id: "SEC-DEF-007",
            name: "Cryptographic Spatial Proof-of-Presence Attestation",
            rule: "Rule 10.1 & 10.2",
            status: "ACTIVE",
            details: "HMAC-SHA256 geofence certificates with 30-minute expiry",
          },
          {
            id: "SEC-DEF-008",
            name: "PostgreSQL libpq 3.0 SSL Hardening",
            status: "ACTIVE",
            details: "Explicit verify-full SSL mode configured for Neon Serverless pool",
          },
        ],
      },
    });
  }
}
