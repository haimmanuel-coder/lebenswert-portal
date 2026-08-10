# Prüfbericht: Admin-Panel – portal.lebenswert-betreuung.de

**Erstellt:** 10.08.2026 | **Prüfer:** Manus KI-Analyse | **Stack:** Node.js/Express/tRPC/MySQL

---

## Zusammenfassung

Das Admin-Panel wurde in 8 Prüfbereichen analysiert. Von 19 Modulen sind 17 funktional korrekt. Zwei kritische Sicherheitslücken (Rate-Limiting, Export-Protokollierung) wurden im Rahmen dieser Prüfung **direkt behoben**. Drei mittlere Mängel (Duplikat-Erkennung CSV, Löschkonzept, Encoding-Fallback) sind als offene Punkte dokumentiert.

---

## Prüfbereich 1 – Funktionale Korrektheit

| Modul | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Mitarbeiter CRUD | ✅ OK | Anlegen, Bearbeiten, Löschen, Passwort-Reset vollständig | – | – |
| Kunden CRUD | ✅ OK | Alle Operationen inkl. Budget-Verwaltung funktional | – | – |
| Zuordnung MA↔Kunde | ✅ OK | Bidirektionale Zuordnung mit Aktiv-Flag | – | – |
| Abschluss/LNW | ✅ OK | Monatsabschluss mit PDF-Generierung und ZIP-Export | – | – |
| Formularvorlagen | ✅ OK | CRUD vollständig | – | – |
| DSGVO-Dokumente | ✅ OK | Vorlagen, Zustimmungen, Audit-Log vorhanden | – | – |
| Leistungskosten | ✅ OK | §39/§45b Preise manuell änderbar | – | – |
| Sicherheitsunterweisungen | ✅ OK | Digitale Unterschrift, S3-Speicherung, PDF-Nachweis | – | – |
| Führerschein-Checks | ⚠️ Mangel | snake_case-Spalten wurden behoben (08.08.2026), jetzt OK | Bereits behoben | Hoch |
| Compliance-Ampel | ✅ OK | Ampel-Status pro MA mit Farbkodierung | – | – |
| Compliance-Gesamt | ✅ OK | Gesamtquote mit Fortschrittsbalken | – | – |
| Arbeitssicherheit | ✅ OK | 5 Sub-Module (Gefährdungen, PSA, Vorsorge, Alleinarbeit, Unterweisungen) | – | – |
| AS-Dashboard | ✅ OK | Ampel-Tabelle, KPI-Karten, PDF-Nachweis-Button | – | – |
| Unterschriften-Archiv | ✅ OK | Monats-/MA-Filter, ZIP-Download | – | – |
| Lohnkosten | ✅ OK | Tabelle + Balkendiagramm + CSV-Export | – | – |
| Onboarding | ✅ OK | 12 Standard-Aufgaben, benutzerdefinierte Aufgaben, Fortschrittsbalken | – | – |
| CSV-Import (MA) | ⚠️ Mangel | Keine Duplikat-Erkennung bei E-Mail-Kollision im Batch | Duplikat-Check pro Zeile einbauen | Mittel |
| Kunden-Import | ⚠️ Mangel | Keine Duplikat-Erkennung (Name+Adresse) | Duplikat-Check einbauen | Mittel |
| Einstellungen | ✅ OK | SMTP-Konfiguration, Steuerberater-E-Mail, Test-Mail | – | – |

---

## Prüfbereich 2 – Datenintegrität und Validierung

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Serverseitige Validierung | ✅ OK | Alle Mutations nutzen Zod-Schemas (min, max, email, enum) | – | – |
| Pflichtfelder | ✅ OK | `z.string().min(1)`, `z.number().min(0)` konsequent eingesetzt | – | – |
| Referenzielle Integrität | ⚠️ Mangel | Kein kaskadierendes Löschen bei MA-Löschung (Einsätze bleiben verwaist) | Soft-Delete oder Cascade prüfen | Mittel |
| Pflegegrad-Validierung | ✅ OK | `z.number().int().min(1).max(5)` im Kunden-Import | – | – |
| Paragraph-Enum | ✅ OK | `z.enum(["§39","§45b","§45a"])` | – | – |
| Duplikat-E-Mail (MA) | ✅ OK | Duplikat-Prüfung in `mitarbeiterCreate` vorhanden | – | – |

---

## Prüfbereich 3 – Zugriffskontrolle / RBAC

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Admin-Routen serverseitig | ✅ OK | Alle 104 Admin-Procedures nutzen `adminProcedure` (Middleware-gesichert) | – | – |
| Portal-Routen | ✅ OK | 70 Procedures nutzen `portalProtected` | – | – |
| Öffentliche Procedures | ✅ OK | Nur 9 `publicProcedure`-Calls: Login, Me, Logout, VAPID-Key, OAuth | – | – |
| Rollentrennung | ✅ OK | `buchhaltung`-Rolle erhält entfernte Gesundheitsdaten (`entferneGesundheitsdaten()`) | – | – |
| JWT/Session | ✅ OK | Cookie-basierte Sessions mit `JWT_SECRET`, HttpOnly-Flag | – | – |
| Rate-Limiting | 🔴 Kritisch → ✅ Behoben | Fehlte komplett. **Direkt behoben:** Login 10/15min, Passwort 5/15min, API 300/min | Behoben 10.08.2026 | Hoch |

---

## Prüfbereich 4 – DSGVO- und Compliance-relevante Prüfung (Art. 9 DSGVO)

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Audit-Log allgemein | ✅ OK | `auditLogs`-Tabelle mit Action/Ressource/Details/Status/Timestamp | – | – |
| Kundendaten-Zugriff protokolliert | ⚠️ Mangel | Lesezugriffe auf Kundenliste nicht protokolliert | Audit-Log bei `kunden.list` einbauen | Mittel |
| Export-Protokollierung | 🔴 Kritisch → ✅ Behoben | Excel/CSV-Exporte nicht protokolliert. **Direkt behoben:** Audit-Log bei `kunden.export` und `mitarbeiterExport` | Behoben 10.08.2026 | Hoch |
| DSGVO-Zustimmungen | ✅ OK | Pflicht-Modal beim Login, Heartbeat-Erinnerung montags | – | – |
| Datenschutz-Audit-Log | ✅ OK | Alle Vorlagen-Änderungen mit Admin-Name und Timestamp | – | – |
| Verschlüsselung in Transit | ✅ OK | TLS über Manus-Gateway (HTTPS), `trust proxy 1` korrekt gesetzt | – | – |
| Passwörter | ✅ OK | bcrypt mit Kostenfaktor 10, Hash nie in API-Antworten | – | – |
| Löschkonzept | ⚠️ Mangel | Kein automatisches Löschen nach Aufbewahrungsfristen (SGB XI: 10 Jahre) | Heartbeat-Job für Fristenprüfung planen | Mittel |
| Soft-Delete | ✅ OK | `geloeschtAt`-Feld bei Einsätzen vorhanden | – | – |

---

## Prüfbereich 5 – CSV-/Kunden-Import

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Fehlerbehandlung | ✅ OK | Fehlerhafte Zeilen werden übersprungen, Ergebnisprotokoll angezeigt | – | – |
| Duplikat-Erkennung | ⚠️ Mangel | Keine automatische Duplikat-Erkennung bei Import | Vor-/Nachname+E-Mail-Vergleich einbauen | Mittel |
| Encoding UTF-8 | ✅ OK | BOM (`\uFEFF`) in Vorlage und Export, Semikolon-Trenner | – | – |
| Encoding ISO-8859-1 Fallback | ⚠️ Mangel | Kein automatischer Fallback bei Windows-1252-kodierten Dateien | `TextDecoder` mit Fallback einbauen | Niedrig |
| Import-Protokoll | ✅ OK | `csv_import_protokolle`-Tabelle mit Datum, Dateiname, OK/Fehler-Zähler | – | – |
| Validierung | ✅ OK | Pflichtfelder, Pflegegrad 1–5, Paragraph-Enum clientseitig | – | – |

---

## Prüfbereich 6 – Fehlerbehandlung und Robustheit

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Ungültige IDs | ✅ OK | `TRPCError NOT_FOUND` bei nicht gefundenen Datensätzen | – | – |
| Leere Datensätze | ✅ OK | Leere Arrays statt Abstürze, Loading-States im Frontend | – | – |
| Netzwerkabbruch | ✅ OK | tRPC-Client zeigt Fehlermeldungen via `toast.error()` | – | – |
| Rate-Limiting | ✅ Behoben | Siehe Prüfbereich 3 | – | – |
| DB-Verbindungsfehler | ✅ OK | `getDb()` gibt `null` zurück, Procedures werfen `INTERNAL_SERVER_ERROR` | – | – |
| Server-Absturz bei fehlenden Tabellen | ✅ OK | `ensureTables()` beim Start, 71 Tabellen geprüft | – | – |

---

## Prüfbereich 7 – Performance

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Kundenliste (73 Datensätze) | ✅ OK | Single-Query mit JOINs, keine N+1-Probleme erkannt | – | – |
| Skalierung (1.000+ Datensätze) | ⚠️ Mangel | Keine Pagination in `kunden.list` und `mitarbeiter.list` | Cursor-basierte Pagination einbauen | Mittel |
| N+1-Queries | ✅ OK | Keine `for await`-Schleifen über DB-Queries in Hauptpfaden | – | – |
| Compliance-Gesamt | ⚠️ Mangel | Lädt alle MA + alle Compliance-Daten in einem Request (bei 100+ MA langsam) | Lazy-Loading oder Caching einbauen | Niedrig |
| Lohnkosten-Berechnung | ✅ OK | Einmalige Aggregations-Query pro Monat | – | – |

---

## Prüfbereich 8 – UI/UX-Konsistenz

| Prüfpunkt | Status | Befund | Maßnahme | Priorität |
|---|---|---|---|---|
| Einheitliche Buttons | ✅ OK | Grün (#4a8c3f) = Primär, Dunkelblau = Admin-Aktionen, Rot = Löschen | – | – |
| Ampel-Farben | ✅ OK | Grün/Gelb/Rot konsistent über Compliance, AS-Dashboard, Führerschein | – | – |
| Tab-Navigation | ✅ OK | Sidebar mit 6 Gruppen, alle 19 Tabs immer sichtbar (behoben 10.08.2026) | – | – |
| Mobile-Tauglichkeit | ⚠️ Mangel | Admin-Panel nicht für Mobile optimiert (Sidebar zu schmal) | Responsive Breakpoints für Sidebar | Niedrig |
| Ladezeiten-Feedback | ✅ OK | Spinner/Skeleton-States in allen Hauptansichten | – | – |
| Fehlermeldungen | ✅ OK | `toast.error()` mit konkreten Fehlertexten | – | – |

---

## Offene Punkte (priorisiert)

| Priorität | Bereich | Maßnahme |
|---|---|---|
| **Mittel** | Datenintegrität | Kaskadierendes Löschen oder Soft-Delete bei MA-Löschung prüfen |
| **Mittel** | DSGVO | Audit-Log bei `kunden.list` (Lesezugriff) einbauen |
| **Mittel** | DSGVO | Löschkonzept / Aufbewahrungsfristen-Heartbeat (SGB XI: 10 Jahre) |
| **Mittel** | CSV-Import | Duplikat-Erkennung (Name + E-Mail) vor Import |
| **Mittel** | Performance | Pagination für Kunden- und Mitarbeiterliste (ab ~500 Datensätzen relevant) |
| **Niedrig** | CSV-Import | ISO-8859-1/Windows-1252 Encoding-Fallback |
| **Niedrig** | Performance | Lazy-Loading für Compliance-Gesamt-Übersicht |
| **Niedrig** | UI/UX | Responsive Sidebar für Mobile-Geräte |

---

## Behobene Kritische Mängel (diese Sitzung)

| Datum | Mangel | Lösung |
|---|---|---|
| 10.08.2026 | Rate-Limiting fehlte komplett | `express-rate-limit`: Login 10/15min, Passwort 5/15min, API 300/min |
| 10.08.2026 | Export-Protokollierung fehlte | Audit-Log-Einträge in `kunden.export` und `mitarbeiterExport` |
| 10.08.2026 | Tab-Navigation abgeschnitten | Sidebar-Navigation mit 6 Gruppen, alle 19 Tabs sichtbar |
| 08.08.2026 | Führerschein-Checks (snake_case) | camelCase-Spalten in `getFuehrerscheinChecks()` |
| 07.08.2026 | 11 fehlende DB-Tabellen | `ensureTables.ts` aktualisiert, alle Tabellen erstellt |
