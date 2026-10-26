import { Request, Response, NextFunction } from "express";

/**
 * Common reconnaissance & scanner probe patterns targeted by malicious automated botnets.
 */
const RECON_PROBE_PATTERNS: RegExp[] = [
  /^\/\.env(\..+)?$/i,
  /^\/\.git(\/.*)?$/i,
  /^\/\.svn(\/.*)?$/i,
  /^\/\.ds_store$/i,
  /^\/\.aws(\/.*)?$/i,
  /^\/wp-(admin|content|includes|login\.php)/i,
  /^\/phpmyadmin/i,
  /^\/pma\/?/i,
  /^\/actuator(\/.*)?$/i,
  /^\/xmlrpc\.php$/i,
  /^\/server-status\/?$/i,
  /^\/config\.(json|yaml|yml|inc\.php)$/i,
  /^\/etc\/passwd/i,
  /^\/bin\/sh/i,
  /^\/cgi-bin\//i,
  /^\/\.well-known\/security\.txt$/i, // Intercept probes attempting unauthorized disclosure
];

/**
 * Anti-Reconnaissance & Scanner Trap Middleware
 * 
 * Enforces Rule 2.4:
 * Drops automated exploit reconnaissance probes immediately with a clean 404,
 * withholding stack traces, framework metadata, and internal server topologies.
 */
export function antiReconTrap(req: Request, res: Response, next: NextFunction): void {
  const urlPath = req.path || req.url;

  for (const pattern of RECON_PROBE_PATTERNS) {
    if (pattern.test(urlPath)) {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown_ip";
      console.warn(`[AntiReconTrap] Dropped unauthorized reconnaissance probe: ${urlPath} from ${clientIp}`);

      // Respond immediately with zero internal disclosure
      res.status(404).json({
        success: false,
        error: "Not Found",
      });
      return;
    }
  }

  next();
}
