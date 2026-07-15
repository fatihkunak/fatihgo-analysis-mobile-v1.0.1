import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Validates that the request is from an authenticated user.
 * Returns the user on success, or sends an error response and returns null.
 */
async function requireAuth(req: import("express").Request, res: import("express").Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    return user;
  } catch {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    // Require authentication for storage access
    const user = await requireAuth(req, res);
    if (!user) return;

    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    // Validate storage key to prevent path traversal or malicious patterns
    // Keys should only contain alphanumeric chars, underscores, hyphens, dots, and slashes
    if (!/^[a-zA-Z0-9_\-./]+$/.test(key)) {
      res.status(400).send("Invalid storage key format");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
