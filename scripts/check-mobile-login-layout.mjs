const devtools = await fetch("http://127.0.0.1:9222/json/new?http://127.0.0.1:3000", { method: "PUT" }).then((r) => r.json());
const socket = new WebSocket(devtools.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

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
  if (!message.id) return;
  const call = pending.get(message.id);
  pending.delete(message.id);
  if (!call) return;
  if (message.error) call.reject(new Error(message.error.message));
  else call.resolve(message.result);
});

await send("Emulation.setDeviceMetricsOverride", { width: 828, height: 1792, deviceScaleFactor: 1, mobile: true });
await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:3000" });
await new Promise((resolve) => setTimeout(resolve, 1500));

const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    return {
      viewportWidth: window.innerWidth,
      rootScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      card: rect('.lw-login-card'),
      email: rect('input[type="email"]'),
      password: rect('input[type="password"], input[type="text"]'),
    };
  })()`,
  returnByValue: true,
});

const data = result.result.value;
const allVisible = [data.card, data.email, data.password].every((item) => item && item.left >= 0 && item.right <= data.viewportWidth);
const noHorizontalScroll = data.rootScrollWidth <= data.viewportWidth && data.bodyScrollWidth <= data.viewportWidth;

console.log(JSON.stringify({ ...data, noHorizontalScroll, allVisible }, null, 2));
socket.close();
if (!noHorizontalScroll || !allVisible) process.exitCode = 1;
