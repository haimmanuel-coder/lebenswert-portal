import { describe, it, expect } from "vitest";

describe("VAPID-Keys Konfiguration", () => {
  it("VAPID_PUBLIC_KEY ist als Umgebungsvariable gesetzt", () => {
    const key = process.env.VAPID_PUBLIC_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(40);
  });

  it("VAPID_PRIVATE_KEY ist als Umgebungsvariable gesetzt", () => {
    const key = process.env.VAPID_PRIVATE_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(20);
  });

  it("VAPID_PUBLIC_KEY ist ein gültiger Base64url-String", () => {
    const key = process.env.VAPID_PUBLIC_KEY ?? "";
    // Base64url: nur A-Z, a-z, 0-9, -, _
    expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("Kein hartcodierter Key im webpush.ts Quellcode", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./server/webpush.ts", "utf-8");
    // Stellt sicher dass kein alter hartcodierter Key mehr im Code steht
    expect(content).not.toContain("BJ1QN3XM");
    expect(content).not.toContain("rLLaOCih");
    // Stellt sicher dass ENV verwendet wird
    expect(content).toContain("ENV.vapidPublicKey");
    expect(content).toContain("ENV.vapidPrivateKey");
  });
});
