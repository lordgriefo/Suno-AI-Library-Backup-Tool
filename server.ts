import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generatePythonScript } from "./src/pythonCode.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Download Python Script endpoint
  app.get("/api/download-script", (req, res) => {
    const maxRetries = parseInt(req.query.retries as string) || 3;
    const downloadAudio = req.query.audio !== "false";
    const downloadVideo = req.query.video !== "false";
    const downloadImages = req.query.image !== "false";
    const downloadMetadata = req.query.metadata !== "false";

    const scriptCode = generatePythonScript({
      maxRetries,
      downloadAudio,
      downloadVideo,
      downloadImages,
      downloadMetadata,
    });

    res.setHeader("Content-Type", "text/x-python; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="suno_backup.py"');
    res.send(scriptCode);
  });

  // Suno Authentication Real-Time Validation Endpoint
  app.post("/api/suno-validate", async (req, res) => {
    try {
      const { token, cookie } = req.body;
      if (!token || typeof token !== "string" || !token.trim()) {
        return res.json({
          status: "unconfigured",
          valid: false,
          message: "No token provided",
        });
      }

      const formattedToken = token.toLowerCase().startsWith("bearer ")
        ? token.trim()
        : `Bearer ${token.trim()}`;

      const cleanHeader = (str: string) =>
        str
          .replace(/\u2026/g, "...")
          .replace(/[\u201c\u201d]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u2013\u2014]/g, "-")
          .replace(/[^\x00-\xFF]/g, "")
          .trim();

      const headers: Record<string, string> = {
        Authorization: cleanHeader(formattedToken),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://suno.com/",
        Origin: "https://suno.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      };

      if (cookie && typeof cookie === "string" && cookie.trim()) {
        headers["Cookie"] = cleanHeader(cookie);
      }

      const testUrls = [
        "https://studio-api.suno.ai/api/feed/?page=0",
        "https://studio-api.suno.ai/api/billing/info/",
        "https://studio-api-prod.suno.com/api/feed/?page=0",
      ];

      for (const url of testUrls) {
        try {
          const testRes = await fetch(url, {
            method: "GET",
            headers,
          });

          if (testRes.status === 200) {
            let trackCount = 0;
            try {
              const data = await testRes.json();
              if (Array.isArray(data)) trackCount = data.length;
              else if (data.clips) trackCount = data.clips.length;
              else if (data.items) trackCount = data.items.length;
            } catch {
              // ignore json parse error on billing
            }
            return res.json({
              status: "active",
              valid: true,
              httpStatus: 200,
              trackCount,
              endpoint: url,
              message: `Active: Verified with Suno API (${trackCount > 0 ? `${trackCount}+ tracks on page 1` : "Session authenticated"})`,
            });
          }

          if (testRes.status === 401) {
            return res.json({
              status: "invalid",
              valid: false,
              httpStatus: 401,
              message: "Invalid: 401 Unauthorized (JWT token expired or incorrect)",
            });
          }

          if (testRes.status === 503 || testRes.status === 403) {
            return res.json({
              status: "blocked",
              valid: false,
              httpStatus: testRes.status,
              message: `Cloudflare ${testRes.status}: Bot challenge triggered (Paste browser cookie to bypass)`,
            });
          }
        } catch (fetchErr: any) {
          console.warn(`[Validate] Error probing ${url}:`, fetchErr.message);
        }
      }

      return res.json({
        status: "invalid",
        valid: false,
        httpStatus: 503,
        message: "Unable to reach Suno API endpoints",
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        valid: false,
        message: `Validation error: ${err.message}`,
      });
    }
  });

  // Suno API Proxy Endpoint for live connection testing in browser
  app.post("/api/suno-proxy", async (req, res) => {
    try {
      const { token, cookie, page = 0 } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Bearer token is required" });
      }

      const formattedToken = token.toLowerCase().startsWith("bearer ")
        ? token
        : `Bearer ${token}`;

      const candidateEndpoints = [
        `https://studio-api.suno.ai/api/feed/?page=${page}`,
        `https://studio-api-prod.suno.com/api/feed/?page=${page}`,
        `https://studio-api.suno.ai/api/feed/v2?page=${page}`
      ];

      const cleanHeader = (str: string) =>
        str
          .replace(/\u2026/g, "...")
          .replace(/[\u201c\u201d]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u2013\u2014]/g, "-")
          .replace(/[^\x00-\xFF]/g, "")
          .trim();

      const headers: Record<string, string> = {
        Authorization: cleanHeader(formattedToken),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://suno.com/",
        Origin: "https://suno.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      };

      if (cookie && typeof cookie === "string" && cookie.trim()) {
        headers["Cookie"] = cleanHeader(cookie);
      }

      let lastResponse: Response | null = null;
      let lastErrorText = "";

      for (const endpointUrl of candidateEndpoints) {
        try {
          const sunoRes = await fetch(endpointUrl, {
            method: "GET",
            headers,
          });

          if (sunoRes.ok) {
            const data = await sunoRes.json();
            return res.json(data);
          }

          lastResponse = sunoRes;
          lastErrorText = await sunoRes.text();
          console.warn(`[Proxy] Endpoint ${endpointUrl} returned HTTP ${sunoRes.status}`);
        } catch (fetchErr: any) {
          console.warn(`[Proxy] Endpoint ${endpointUrl} fetch error: ${fetchErr.message}`);
        }
      }

      if (lastResponse) {
        return res.status(lastResponse.status).json({
          error: `Suno API returned HTTP ${lastResponse.status}`,
          details: lastErrorText || "Service unavailable or blocked by Cloudflare",
        });
      }

      return res.status(503).json({ error: "Failed to connect to any Suno feed endpoints" });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to reach Suno API", details: err.message });
    }
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
