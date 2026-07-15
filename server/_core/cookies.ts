import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Checks if the hostname is a known Manus preview domain pattern.
 * e.g., "3000-xxx.manuspre.computer" or "8081-xxx.manuspre.computer"
 * These need cross-subdomain cookie sharing for the preview environment.
 */
function isPreviewDomain(hostname: string): boolean {
  // Manus preview domains follow the pattern: PORT-sandboxid.region.domain
  return /^\d{4}-[a-zA-Z0-9]+\.[a-zA-Z0-9.-]+\.computer$/.test(hostname);
}

/**
 * Extract parent domain for cookie sharing across subdomains.
 * Only used in preview environments where cookie sharing is necessary.
 * e.g., "3000-xxx.manuspre.computer" -> ".manuspre.computer"
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // Need at least 3 parts for a subdomain
  if (parts.length < 3) {
    return undefined;
  }

  // Only set parent domain for known preview domains to limit risk
  if (!isPreviewDomain(hostname)) {
    return undefined;
  }

  // Return parent domain with leading dot (e.g., ".manuspre.computer")
  // This allows cookie to be shared across subdomains in preview environments
  return "." + parts.slice(-2).join(".");
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);

  return {
    domain,
    httpOnly: true,
    path: "/",
    // Use "lax" by default for CSRF protection
    // Use "none" only in preview environments where cross-subdomain cookie sharing is needed
    sameSite: isPreviewDomain(hostname) ? "none" : "lax",
    secure: isSecureRequest(req),
  };
}
