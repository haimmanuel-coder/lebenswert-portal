import { signPortalToken, PORTAL_COOKIE } from "../server/portalAuth.ts";

const token = await signPortalToken(Number(process.env.ADMIN_UI_TEST_ID ?? 3), { mfa: true, expiresIn: "10m" });
const desktop = process.env.ONBOARDING_VIEWPORT === "desktop";
const viewport = desktop
  ? { width: 1280, height: 900, mobile: false, name: "Desktop 1280×900" }
  : { width: 828, height: 1792, mobile: true, name: "Remote-Mobil 828×1792" };
const target = await fetch("http://127.0.0.1:9222/json/new?http://127.0.0.1:3000", { method: "PUT" }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data.toString());
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id);
  message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result);
});

await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });
await send("Network.enable");
await send("Network.clearBrowserCookies");
await send("Network.setCookie", { name: PORTAL_COOKIE, value: token, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" });
await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:3000" });

let ready = false;
for (let attempt = 0; attempt < 24; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const state = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('.lw-onboarding-card') && document.querySelector('.lw-cookie-banner'))", returnByValue: true });
  if (state.result.value) { ready = true; break; }
}
if (!ready) throw new Error("Einführungsdialog oder Cookie-Hinweis wurde nicht geladen.");

const measure = await send("Runtime.evaluate", {
  expression: `(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const { top, bottom, left, right } = el.getBoundingClientRect();
      return { top, bottom, left, right };
    };
    const next = [...document.querySelectorAll('.lw-onboarding-card button')].find((button) => button.textContent?.includes('Weiter'));
    const nextRect = next ? (() => { const { top, bottom, left, right } = next.getBoundingClientRect(); return { top, bottom, left, right }; })() : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      cookieOpenClass: document.body.classList.contains('lw-cookie-open'),
      card: rect('.lw-onboarding-card'),
      cookie: rect('.lw-cookie-banner'),
      next: nextRect,
    };
  })()`,
  returnByValue: true,
});

const data = measure.result.value;
const cardAboveCookie = data.card.bottom <= data.cookie.top - 8;
const nextVisible = data.next && data.next.top >= 0 && data.next.bottom <= data.cookie.top - 8;
console.log(JSON.stringify({ viewportName: viewport.name, ...data, cardAboveCookie, nextVisible }, null, 2));
socket.close();
if (!data.cookieOpenClass || !cardAboveCookie || !nextVisible) process.exitCode = 1;
