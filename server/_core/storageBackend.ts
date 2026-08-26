/**
 * ════════════════════════════════════════════════════════════════════════════
 *  DATEI-SPEICHER-BACKEND (S3-kompatibel ODER Manus/Forge)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Kapselt das eigentliche Ablegen und die signierten Download-URLs, damit das
 * Portal unabhängig von der Manus-Plattform läuft:
 *
 *   - Sind die S3-Variablen gesetzt (Bucket + Zugangsdaten), wird ein eigener
 *     S3-kompatibler Speicher genutzt (AWS, Hetzner, IONOS, MinIO … – jeder
 *     EU-Anbieter).
 *   - Andernfalls wird – wie bisher – der Manus/Forge-Speicher verwendet.
 *   - Ist nichts konfiguriert, wird ein sprechender Fehler geworfen.
 *
 * Die öffentliche Schnittstelle (storage.ts) bleibt unverändert.
 */

import { ENV } from "./env";

export type StorageBackend = "s3" | "forge" | "none";

/** Reine Auswahl-Logik (ohne Seiteneffekte) – so unit-testbar. */
export function waehleBackend(cfg: {
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  forgeApiUrl?: string;
  forgeApiKey?: string;
}): StorageBackend {
  if (cfg.s3Bucket && cfg.s3AccessKeyId && cfg.s3SecretAccessKey) return "s3";
  if (cfg.forgeApiUrl && cfg.forgeApiKey) return "forge";
  return "none";
}

export function aktivesBackend(): StorageBackend {
  return waehleBackend(ENV);
}

// ── S3-Client (nur bei Bedarf initialisiert) ─────────────────────────────────

let _s3Client: import("@aws-sdk/client-s3").S3Client | null = null;

async function getS3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: ENV.s3Region || "us-east-1",
      // Eigener Endpunkt (z. B. https://fsn1.your-objectstorage.com). Für echtes
      // AWS S3 kann S3_ENDPOINT leer bleiben; dann greift der Standard-Endpunkt.
      endpoint: ENV.s3Endpoint || undefined,
      forcePathStyle: ENV.s3ForcePathStyle,
      credentials: {
        accessKeyId: ENV.s3AccessKeyId,
        secretAccessKey: ENV.s3SecretAccessKey,
      },
    });
  }
  return _s3Client;
}

// ── Öffentliche Backend-Operationen ──────────────────────────────────────────

/** Legt ein Objekt unter `key` ab. */
export async function backendPut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  const backend = aktivesBackend();

  if (backend === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3();
    const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
    await client.send(new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return;
  }

  if (backend === "forge") {
    const { forgeUrl, forgeKey } = getForgeConfig();
    const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
    presignUrl.searchParams.set("path", key);
    const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!presignResp.ok) {
      const msg = await presignResp.text().catch(() => presignResp.statusText);
      throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
    }
    const { url: s3Url } = (await presignResp.json()) as { url: string };
    if (!s3Url) throw new Error("Forge returned empty presign URL");
    const blob = typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
    const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
    if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
    return;
  }

  throw new Error(
    "Datei-Speicher nicht konfiguriert: entweder S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY " +
    "oder BUILT_IN_FORGE_API_URL/BUILT_IN_FORGE_API_KEY setzen.",
  );
}

/** Liefert eine zeitlich begrenzte, signierte Download-URL für `key`. */
export async function backendSignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  const backend = aktivesBackend();

  if (backend === "s3") {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await getS3();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }), { expiresIn });
  }

  if (backend === "forge") {
    const { forgeUrl, forgeKey } = getForgeConfig();
    const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
    getUrl.searchParams.set("path", key);
    const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => resp.statusText);
      throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
    }
    const { url } = (await resp.json()) as { url: string };
    if (!url) throw new Error("Empty signed URL from backend");
    return url;
  }

  throw new Error("Datei-Speicher nicht konfiguriert (weder S3 noch Forge).");
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error("Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
