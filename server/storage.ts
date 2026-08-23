// Datei-Speicher-Hilfen. Die eigentliche Ablage/Signierung liegt im
// backend-agnostischen Modul _core/storageBackend.ts (S3-kompatibel ODER
// Manus/Forge, je nach gesetzten Umgebungsvariablen). Downloads werden über
// den Pfad /manus-storage/{key} ausgeliefert (307-Redirect, siehe storageProxy).

import { backendPut, backendSignedGetUrl } from "./_core/storageBackend";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  await backendPut(key, data, contentType);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return backendSignedGetUrl(normalizeKey(relKey));
}
