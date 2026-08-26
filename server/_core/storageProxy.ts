import type { Express } from "express";
import { aktivesBackend, backendSignedGetUrl } from "./storageBackend";

// Liefert gespeicherte Dateien aus: /manus-storage/{key} -> 307-Redirect auf eine
// signierte, zeitlich begrenzte URL des aktiven Backends (S3 oder Forge). Der
// Pfad bleibt bewusst "/manus-storage", damit bereits gespeicherte Verweise
// (in der Datenbank/PDFs) nach dem Umzug weiter funktionieren.
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (aktivesBackend() === "none") {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const url = await backendSignedGetUrl(key);
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
