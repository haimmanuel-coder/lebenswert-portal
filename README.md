# Lebenswert-Portal

Mitarbeiter- und Verwaltungsportal für die Seniorenassistenz/Betreuung: Login,
Dashboard, Einsatz- und Tourenplanung, Zeiterfassung, Leistungsnachweise,
Fahrtenbuch, Budget-/Abrechnungslogik, Kunden-/Mitarbeiterverwaltung, CSV-Import
und DSGVO-Audit-Log.

**Technischer Stack:** React + Vite (Frontend), Node.js + tRPC (Backend),
MySQL via Drizzle ORM, pnpm als Paketmanager.

---

## Voraussetzungen

- **Node.js 20.19+** (oder 22.12+) – Vite 7 setzt diese Version voraus
- **pnpm** (im Projekt über das Feld `packageManager` gepinnt; `corepack enable` genügt)
- **MySQL 8** oder **MariaDB** (erreichbare Datenbank)

## Schnellstart (lokal)

```bash
corepack enable                 # aktiviert das gepinnte pnpm
pnpm install --frozen-lockfile  # Abhängigkeiten
cp .env.example .env            # Umgebungsvariablen eintragen (siehe unten)
pnpm build                      # Frontend + Server bauen
pnpm start                      # Produktionsserver starten (Standard-Port 3000)
```

Zum Entwickeln: `pnpm dev` (Hot-Reload). Tests: `pnpm test`. Typprüfung: `pnpm check`.

## Umgebungsvariablen

Alle Variablen sind in **`.env.example`** dokumentiert. Die wichtigsten:

| Variable | Pflicht | Zweck |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL-Verbindung `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | ✅ | Login-Tokens + Verschlüsselung (min. 16 Zeichen; in Produktion zwingend) |
| `NODE_ENV` | ✅ | auf `production` setzen |
| `PORT` | – | Standard 3000 |
| `SMTP_*` | empfohlen | E-Mail-Versand (Passwort-Reset, Benachrichtigungen) |
| `VAPID_*`, `REDIS_URL` | optional | Push-Nachrichten bzw. Cache |
| `BUILT_IN_FORGE_*`, `OAUTH_*`, `VITE_APP_ID` | Manus | siehe Abschnitt **Umzug** |

## Bauen & Starten (Produktion)

```bash
pnpm install --frozen-lockfile
pnpm build     # erzeugt dist/index.js (Server) und dist/public (Frontend)
pnpm start     # NODE_ENV=production node dist/index.js
```

Der Server liefert das gebaute Frontend aus `dist/public` selbst aus – es wird
**kein** separater Webserver benötigt. Er lauscht auf `PORT` (Standard 3000);
ein vorgelagerter Reverse-Proxy (nginx/Caddy) für TLS wird empfohlen.

## Datenbank einrichten

Für eine **frische** Datenbank alle Tabellen anlegen (Baseline enthält alle 51
Tabellen, idempotent):

```bash
mysql --host=HOST --user=USER --password DBNAME < drizzle/baseline/0000_basisschema.sql
```

Spätere Schemaänderungen liegen als nummerierte Dateien unter `drizzle/`.
Der kontrollierte GitHub-Actions-Workflow `Datenbank-Migration` kann Migrationen
einspielen (manuell auslösbar, mit Backup und Prüfmodus).

---

## Deployment-Optionen

### A) Generischer Node-Host (empfohlen)
Ein Host, der Node-Apps ausführt (z. B. VPS, App Platform, Render, Railway):

- **Build-Befehl:** `pnpm install --frozen-lockfile && pnpm build`
- **Start-Befehl:** `pnpm start` (bzw. `node dist/index.js`)
- **Node-Version:** 20 (siehe `.nvmrc`)
- **Umgebungsvariablen:** wie oben setzen
- **Datenbank:** eine erreichbare MySQL-Instanz bereitstellen

### B) Docker (maximal portabel)
Das Repo enthält ein `Dockerfile`:

```bash
docker build -t lebenswert-portal .
docker run -p 3000:3000 --env-file .env lebenswert-portal
```

Für Datenbank + App zusammen eignet sich ein `docker compose`-Setup (App-Image +
ein `mysql:8`-Container), das die `.env` einbindet.

---

## Umzug von Manus auf einen eigenen Webhoster

Wichtig: **GitHub enthält nur den Code – nicht die Betriebsdaten.** Ein
vollständiger Umzug besteht aus drei Teilen:

1. **Code** – aus diesem Repo (Branch `main`) bauen (siehe oben).
2. **Datenbank** – die MySQL-Daten von Manus exportieren und beim neuen Hoster
   importieren:
   ```bash
   # auf der Quelle:
   mysqldump --host=... --user=... --password DBNAME > lebenswert-daten.sql
   # beim Ziel:
   mysql --host=... --user=... --password NEUE_DB < lebenswert-daten.sql
   ```
3. **Secrets** – alle Umgebungsvariablen beim neuen Hoster hinterlegen. `JWT_SECRET`
   **muss identisch** zum bisherigen Wert bleiben, sonst sind bestehende
   verschlüsselte Zugangsdaten (z. B. SMTP) nicht mehr entschlüsselbar und
   aktive Sitzungen werden ungültig.

### Manus/Forge-Abhängigkeiten (müssen ersetzt werden)
Diese Funktionen nutzen von Manus bereitgestellte Dienste über die
`BUILT_IN_FORGE_*`-Schnittstelle und funktionieren ohne Ersatz nicht:

| Funktion | Abhängigkeit | Ersatz beim Umzug |
|---|---|---|
| Datei-Speicher (Unterschriften, Backups, Export-Pakete) | Forge-Speicher | **eingebaut:** S3-kompatibler Speicher über `S3_*`-Variablen (siehe unten) |
| KI – Berichtsvorschläge/Analysen (LLM) | Forge-KI | **eingebaut:** OpenAI-kompatibler Anbieter über `LLM_API_URL`/`LLM_API_KEY`/`LLM_MODEL` |
| KI – Sprache-zu-Text (Besuchsberichte) | Forge-STT | **eingebaut:** OpenAI-/Whisper-kompatibel über `STT_API_URL`/`STT_API_KEY`/`STT_MODEL` |
| Karten (Tourenplanung + Anzeige) | Forge-Maps | **eingebaut:** eigener Google-Maps-Schlüssel (`GOOGLE_MAPS_API_KEY` server, `VITE_GOOGLE_MAPS_API_KEY` Browser) |

Alle vier Bereiche greifen automatisch auf den eigenen Anbieter zu, sobald die
jeweiligen Variablen gesetzt sind – sonst weiter Forge (Manus). Kein Codeeingriff nötig.
Hinweis: `VITE_GOOGLE_MAPS_API_KEY` wird zur **Build-Zeit** eingebettet (bei Docker als
Build-Argument übergeben); die übrigen Werte wirken zur Laufzeit.

**Datei-Speicher umstellen:** Setze `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
(sowie `S3_REGION`/`S3_ENDPOINT` je nach Anbieter). Sobald diese gesetzt sind, nutzt die
App automatisch den eigenen S3-Speicher statt Forge – ohne Codeänderung. Der Download-Pfad
`/manus-storage/{key}` bleibt erhalten, sodass bereits gespeicherte Verweise weiter
funktionieren. Läuft mit jedem S3-kompatiblen EU-Anbieter (AWS S3 eu-*, Hetzner, IONOS, MinIO …).

**Kernbetrieb** (Login per E-Mail/Passwort, Kunden, Termine, Import, Export-Berechnung,
Audit-Log) ist von diesen Diensten **unabhängig** und läuft mit MySQL + `JWT_SECRET`
+ SMTP auf jedem Node-Host.

## Verifikation nach dem Deploy

- Anmeldung mit einem bestehenden Konto möglich
- Admin → Kunden-CSV-Import: Bestandskunde wird als „↻ wird aktualisiert" erkannt
- Admin → Audit-Log: Einträge (`EXPORT`/`IMPORT`/`CREATE`/`UPDATE`) erscheinen
