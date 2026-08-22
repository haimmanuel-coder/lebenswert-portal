# Audit-Logging (K-5/K-6) & Import-Auditierbarkeit

Diese Änderung ergänzt den bereits in `main` vorhandenen Audit- und Import-Bestand
um die noch fehlenden Protokollierungen. Sie ist **rein additiv** (nur zusätzliche
`createAuditLog`-Aufrufe) und ändert kein bestehendes Verhalten.

## Ausgangslage (Bestand in `main`)

`main` besitzt bereits umfangreiche Audit-Infrastruktur:

- zentrale Tabelle `auditLogs` + `createAuditLog()` / `getAuditLogs()`
- Fachlogs `datenschutz_audit_log`, `arbeitssicherheit_audit_log`
- Frontend `AuditLogTab.tsx`
- protokollierte Exporte: DATEV, Lexware, Massen-Export, Monatsabschluss, E-Brief
- CSV-Kundenimport (`csvImportRouter`, `csv_import_protokolle`, `KundenCsvImportTab.tsx`)

## Geschlossene Lücken

Beim Abgleich fielen fünf personenbezogene Zugriffe **ohne** zentralen Audit-Eintrag auf:

| Endpunkt | Datei:Zeile | Datenart | Neue Aktion |
|---|---|---|---|
| `kunden.create` | `server/routers.ts` | Anlage Kundenstammdaten | `CREATE` / `kunde` |
| `kunden.update` | `server/routers.ts` | Änderung Kundenstammdaten | `UPDATE` / `kunde` |
| `kunden.export` | `server/routers.ts` | Massen-Export (Anschrift, Pflegegrad, Budget) | `EXPORT` / `kunden` |
| `export.monatspaket` | `server/routers.ts` | **Gesundheitsdaten** (Spalte „Gesundheit"), Art. 9 DSGVO | `EXPORT` / `monatspaket` |
| `mitarbeiterExport` | `server/routers.ts` | Personaldaten inkl. Lohn/Gehalt | `EXPORT` / `mitarbeiter` |

Zusätzlich schreibt der CSV-Import (`csvImport.protokollSpeichern`) jetzt einen
zusammenfassenden `IMPORT`-Eintrag ins zentrale `auditLogs`. Der Endpunkt wird von zwei
Import-Masken geteilt (Kunden über `KundenCsvImportTab`, Mitarbeiter über `CsvImportTab`);
die Entität wird deshalb mitgegeben, damit `ressource` den tatsächlichen Datenbestand
benennt (`kunden` bzw. `mitarbeiter`). Die einzelnen Zeilen sind bereits über das jeweilige
Anlage-Endpunkt protokolliert – Kunden über `kunden.create` (`CREATE`/`kunde`), Mitarbeiter
über `admin.mitarbeiterCreate` (`ADMIN`/`mitarbeiter`).

**Wirkung:** Jeder lesende Massen-Zugriff auf personenbezogene bzw. Gesundheitsdaten
(Export) und jede schreibende Änderung an Kundenstammdaten ist nun im Audit-Log
nachvollziehbar (DSGVO Art. 5 Abs. 2 – Rechenschaftspflicht; Art. 30 – Verzeichnis von
Verarbeitungstätigkeiten).

## Test-Härtung

`server/secretEncryption.test.ts` benötigte bisher ein extern gesetztes `JWT_SECRET` und
schlug im CI (das keine Laufzeitumgebung setzt) fehl. Der Test stellt den Schlüssel jetzt
hermetisch selbst bereit, falls keiner vorhanden ist – ohne Produktionslogik zu verändern.

Stand nach Änderung: **TypeScript 0 Fehler · 127 Tests grün (3 übersprungen) · Build erfolgreich.**

## Offen: echte automatische Synchronisation („Import Phase 2")

Der Import in `main` ist ein **manueller** CSV-Upload. Eine echte *automatische*
Synchronisation (wiederkehrender, terminierter Abgleich) benötigt eine definierte
**Datenquelle**, die nicht aus dem Code ableitbar ist. Bevor das gebaut wird, ist zu klären:

1. **Quelle:** SFTP-Verzeichnis, HTTPS-URL/API, Google Sheet, E-Mail-Anhang oder Netzlaufwerk?
2. **Takt:** stündlich / täglich / manuell angestoßen? (der `datenbank-migration`-Workflow
   bzw. der vorhandene Scheduler könnte den Lauf auslösen)
3. **Konfliktregel:** überschreiben, nur neue anlegen, oder Upsert per Schlüssel
   (E-Mail / Versicherungsnummer)?
4. **Format:** ausschließlich CSV oder auch Excel (`.xlsx`)?

Sobald Quelle und Takt feststehen, lässt sich der Auto-Sync auf der jetzigen,
auditierbaren Import-Basis aufsetzen.
