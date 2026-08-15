import { SignJWT } from "jose";

const baseUrl = process.env.SECURITY_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const employeeId = Number(process.env.SECURITY_TEST_EMPLOYEE_ID ?? "30004");
const adminId = Number(process.env.SECURITY_TEST_ADMIN_ID ?? "3");
const secret = process.env.JWT_SECRET;

if (!secret) throw new Error("JWT_SECRET fehlt für den Sicherheits-Regressionstest.");

async function tokenFor(mitarbeiterId) {
  return new SignJWT({ mitarbeiterId, mfa: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

const token = await tokenFor(employeeId);
const adminToken = await tokenFor(adminId);

async function expectStatus(name, url, expectedStatus, init = {}) {
  const response = await fetch(url, { redirect: "manual", ...init });
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(`${name}: erwartet ${expectedStatus}, erhalten ${response.status}. Antwort: ${body.slice(0, 160)}`);
  }
  return { name, status: response.status };
}

const cookieHeader = { Cookie: `lb_portal_token=${token}` };
const results = [];

results.push(await expectStatus(
  "Mitarbeiterzugriff auf Datenschutz-Adminliste",
  `${baseUrl}/api/trpc/datenschutz.listVorlagen`,
  403,
  { headers: cookieHeader },
));
results.push(await expectStatus(
  "Administratorzugriff auf Datenschutz-Adminliste",
  `${baseUrl}/api/trpc/datenschutz.listVorlagen`,
  200,
  { headers: { Cookie: `lb_portal_token=${adminToken}` } },
));
results.push(await expectStatus(
  "Mitarbeiterzugriff auf Datenschutz-CSV-Export",
  `${baseUrl}/api/trpc/datenschutz.csvExport`,
  403,
  { headers: cookieHeader },
));
results.push(await expectStatus(
  "Administratorzugriff auf Datenschutz-CSV-Export",
  `${baseUrl}/api/trpc/datenschutz.csvExport`,
  200,
  { headers: { Cookie: `lb_portal_token=${adminToken}` } },
));
results.push(await expectStatus(
  "Mitarbeiterzugriff auf Datenschutz-Auditlog",
  `${baseUrl}/api/trpc/datenschutz.getAuditLog`,
  403,
  { headers: cookieHeader },
));
results.push(await expectStatus(
  "Administratorzugriff auf Datenschutz-Auditlog",
  `${baseUrl}/api/trpc/datenschutz.getAuditLog`,
  200,
  { headers: { Cookie: `lb_portal_token=${adminToken}` } },
));
results.push(await expectStatus(
  "Unangemeldeter SSE-Zugriff",
  `${baseUrl}/api/sse?mitarbeiterId=${employeeId}`,
  401,
));
results.push(await expectStatus(
  "Mitarbeiterzugriff auf fremden SSE-Kanal",
  `${baseUrl}/api/sse?mitarbeiterId=1`,
  403,
  { headers: cookieHeader },
));
results.push(await expectStatus(
  "Unangemeldeter Foto-Upload",
  `${baseUrl}/api/upload/foto`,
  401,
  { method: "POST" },
));
results.push(await expectStatus(
  "Unangemeldeter Audio-Upload",
  `${baseUrl}/api/upload/audio`,
  401,
  { method: "POST" },
));
results.push(await expectStatus(
  "Unangemeldeter Scheduler-Aufruf",
  `${baseUrl}/api/scheduled/monatsabschluss-erinnerung`,
  403,
  { method: "POST" },
));

console.log(JSON.stringify({ securityRegressionPassed: true, checks: results }, null, 2));
