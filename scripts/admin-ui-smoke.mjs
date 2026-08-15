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

const result = await send("Runtime.evaluate", {
  expression: `(() => ({
    isLoginVisible: Boolean(document.querySelector('input[type="email"]')),
    pageText: document.body.innerText,
    navigation: [...document.querySelectorAll('button, a')].map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 80),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  }))()`,
  returnByValue: true,
});
const data = result.result.value;
const adminShellVisible = /Admin|Mitarbeiter|Kunden|Planung/.test(data.pageText) && !data.isLoginVisible;
const moduleLabels = ["Einsatzplanung", "Kundenliste", "Leistungsnachweise", "Mitarbeiterakte", "Arbeitssicherheit", "Datenschutz", "Admin-Panel"];
const modules = [];
for (const label of moduleLabels) {
  const click = await send("Runtime.evaluate", {
    expression: `(() => {
      const target = [...document.querySelectorAll('button, a')].find((el) => el.textContent?.trim().includes(${JSON.stringify(label)}));
      if (!target) return false;
      target.click();
      return true;
    })()`,
    returnByValue: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
  const moduleState = await send("Runtime.evaluate", {
    expression: `(() => ({ text: document.body.innerText, hasError: /Fehler|ErrorBoundary|Something went wrong/i.test(document.body.innerText) }))()`,
    returnByValue: true,
  });
  modules.push({ label, clicked: click.result.value, rendered: moduleState.result.value.text.includes(label), hasError: moduleState.result.value.hasError });
}
const modulesHealthy = modules.every((module) => module.clicked && !module.hasError);
console.log(JSON.stringify({ adminShellVisible, horizontalOverflow: data.horizontalOverflow, modules, navigation: data.navigation }, null, 2));
socket.close();
if (!adminShellVisible || data.horizontalOverflow || !modulesHealthy) process.exitCode = 1;
