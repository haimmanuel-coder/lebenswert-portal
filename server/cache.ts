import { createClient, type RedisClientType } from "redis";
import { ENV } from "./_core/env";

type MemoryEntry = { value: string; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();
let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!ENV.redisUrl) return null;
  if (redisClient?.isReady) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisConnectPromise = (async () => {
    try {
      const client = createClient({
        url: ENV.redisUrl,
        socket: { connectTimeout: 1500, reconnectStrategy: false },
      });
      client.on("error", error => {
        console.warn("[Cache] Redis vorübergehend nicht verfügbar:", error.message);
      });
      await client.connect();
      redisClient = client as RedisClientType;
      console.log("[Cache] Redis-Verbindung aktiv");
      return redisClient;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Verbindungsfehler";
      console.warn(`[Cache] Redis nicht erreichbar, lokaler Kurzzeit-Cache wird verwendet: ${message}`);
      redisClient = null;
      return null;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
}

function readMemory(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeMemory(key: string, value: string, ttlSeconds: number) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  try {
    const raw = redis ? await redis.get(key) : readMemory(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch (error) {
    console.warn("[Cache] Lesen fehlgeschlagen, Abfrage läuft ohne Cache:", error);
    return null;
  }
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds = 30): Promise<void> {
  const raw = JSON.stringify(value);
  const redis = await getRedisClient();
  try {
    if (redis) await redis.set(key, raw, { EX: ttlSeconds });
    else writeMemory(key, raw, ttlSeconds);
  } catch (error) {
    console.warn("[Cache] Schreiben fehlgeschlagen, Ergebnis wird nur direkt ausgeliefert:", error);
  }
}

export async function deleteCacheKeys(...keys: string[]): Promise<void> {
  keys.forEach(key => memoryCache.delete(key));
  const redis = await getRedisClient();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(keys);
  } catch (error) {
    console.warn("[Cache] Invalidierung fehlgeschlagen:", error);
  }
}

export async function getOrSetCachedJson<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await getCachedJson<T>(key);
  if (cached !== null) return cached;
  const value = await loader();
  await setCachedJson(key, value, ttlSeconds);
  return value;
}

export function cacheStatus() {
  return {
    modus: ENV.redisUrl ? (redisClient?.isReady ? "redis_aktiv" : "redis_konfiguriert") : "lokaler_kurzzeitcache",
    redisKonfiguriert: Boolean(ENV.redisUrl),
    redisVerbunden: Boolean(redisClient?.isReady),
  };
}
