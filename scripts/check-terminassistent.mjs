import { signPortalToken, PORTAL_COOKIE } from "../server/portalAuth.ts";

const adminId = Number(process.env.ADMIN_UI_TEST_ID ?? 3);
const token = await signPortalToken(adminId, { mfa: true, expiresIn: "10m" });
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

await send("Network.enable");
await send("Network.setCookie", { name: PORTAL_COOKIE, value: token, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" });
await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:3000" });
await new Promise((resolve) => setTimeout(resolve, 1800));

await send("Runtime.evaluate", {
  expression: `(() => [...document.querySelectorAll('button,a')].find((el) => el.textContent?.includes('Einsatzplanung'))?.click())()`,
  returnByValue: true,
});
await new Promise((resolve) => setTimeout(resolve, 700));
const clicked = await send("Runtime.evaluate", {
  expression: `(() => { const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.includes('Meinen Termin planen')); if (!button) return false; button.click(); return true; })()`,
  returnByValue: true,
});
await new Promise((resolve) => setTimeout(resolve, 500));
const measured = await send("Runtime.evaluate", {
  expression: `(() => {
    const overlay = document.querySelector('[data-testid="terminassistent-overlay"]');
    const dialog = document.querySelector('[data-testid="terminassistent-dialog"]');
    if (!overlay || !dialog) return { overlay: Boolean(overlay), dialog: Boolean(dialog) };
    const r = dialog.getBoundingClientRect();
    const s = getComputedStyle(dialog);
    const center = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(32, r.height / 2));
    return {
      overlay: true,
      dialog: true,
      visible: s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 && r.width > 0 && r.height > 0,
      inViewport: r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bounds: { top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), left: Math.round(r.left) },
      width: Math.round(r.width),
      height: Math.round(r.height),
      centerInsideDialog: Boolean(center?.closest('[data-testid="terminassistent-dialog"]')),
      hasFormLabels: /Mitarbeiter \*|Kunde \*|Datum \*/.test(dialog.textContent ?? ''),
    };
  })()`,
  returnByValue: true,
});

const result = { clicked: clicked.result.value, ...measured.result.value };
console.log(JSON.stringify(result, null, 2));
socket.close();
if (!result.clicked || !result.overlay || !result.dialog || !result.visible || !result.inViewport || !result.centerInsideDialog || !result.hasFormLabels) process.exitCode = 1;
