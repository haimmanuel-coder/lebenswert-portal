# Umzug auf Railway – Schritt für Schritt

Diese Anleitung führt den Umzug des Lebenswert-Portals von Manus auf
[Railway](https://railway.app) durch: App **und** MySQL-Datenbank an einem Ort.

> **Voraussetzung Code:** Das Repo ist bereits vorbereitet (README, `.env.example`,
> `Dockerfile`). Railway erkennt das `Dockerfile` automatisch und baut damit.

---

## ⚠️ Wichtig zuerst: Datenschutz (Gesundheitsdaten)

Das Portal speichert **Gesundheitsdaten** von Pflegekunden (Art. 9 DSGVO – besondere
Kategorie). Daraus folgt zwingend:

1. **Serverstandort EU** wählen – bei Railway die Region **„EU West (Amsterdam)"**.
2. **Auftragsverarbeitungsvertrag (AVV/DPA)** mit dem Hoster abschließen. Railway
   bietet ein DPA an (Dashboard → Account/Workspace → Legal/Compliance).
3. Wenn maximale Rechtssicherheit gefordert ist, einen **EU-ansässigen** Anbieter
   erwägen (z. B. Hetzner, IONOS, Scalingo). Die technischen Schritte hier gelten
   sinngemäß auch dort (Node-App + MySQL + Umgebungsvariablen).

Diesen Punkt bitte **vor** dem Echtbetrieb mit realen Kundendaten klären.

---

## Vorbereitung (einmalig)

- [ ] **Railway-Konto** erstellen und **GitHub verbinden** (Zugriff auf das Repo
      `haimmanuel-coder/lebenswert-portal` erlauben).
- [ ] **`JWT_SECRET` festlegen.** Zwei Fälle:
  - Bestehende verschlüsselte Daten/Sitzungen sollen erhalten bleiben →
    **denselben** `JWT_SECRET`-Wert wie bei Manus verwenden.
  - Egal / Neustart → neuen Wert erzeugen: `openssl rand -base64 48`. Dann müssen
    gespeicherte SMTP-Zugangsdaten neu eingegeben werden und alle melden sich neu an.
- [ ] **Zugang zur bisherigen Manus-Datenbank** besorgen (die `DATABASE_URL` bzw.
      Host/Benutzer/Passwort), um die Daten zu exportieren.

---

## Phase 1 – Projekt und App-Service anlegen

1. Railway → **New Project** → **Deploy from GitHub repo**.
2. Repo **`lebenswert-portal`** wählen, Branch **`main`**.
3. Unter **Settings → Region** die **EU-Region (Amsterdam)** wählen.
4. Railway erkennt das `Dockerfile` und startet den ersten Build automatisch.
   (Der erste Lauf schlägt evtl. fehl, weil noch keine Datenbank/Variablen gesetzt
   sind – das ist normal, wird in den nächsten Phasen behoben.)

## Phase 2 – MySQL-Datenbank hinzufügen

1. Im Projekt → **+ New** → **Database** → **Add MySQL**.
2. Railway legt einen MySQL-Dienst mit eigenen Verbindungsvariablen an
   (u. a. `MYSQL_URL`).
3. Ebenfalls in der **EU-Region** belassen.

## Phase 3 – Umgebungsvariablen am App-Service setzen

App-Service → **Variables** → folgende Werte anlegen:

| Variable | Wert |
|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` ← **als Referenz** auf den MySQL-Dienst |
| `JWT_SECRET` | dein Wert (siehe Vorbereitung) |
| `NODE_ENV` | `production` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | deine SMTP-Daten |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | optional (Push) |
| `REDIS_URL` | optional |

**Datei-Speicher (empfohlen, ersetzt den Manus-Speicher):** Bei einem
S3-kompatiblen EU-Anbieter (z. B. Hetzner Object Storage, IONOS, AWS S3 eu-*) einen
Bucket anlegen und ergänzen:

| Variable | Wert |
|---|---|
| `S3_BUCKET` | Name des Buckets |
| `S3_REGION` | z. B. `eu-central-1` |
| `S3_ENDPOINT` | Endpunkt des Anbieters (bei echtem AWS leer lassen) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Zugangsschlüssel des Buckets |

Sobald diese gesetzt sind, nutzt die App automatisch den eigenen Speicher – ohne
Codeänderung. Ohne diese Werte funktionieren Unterschriften/Backups/Export-Dateien
(noch) nicht.

Hinweise:
- **`PORT` NICHT setzen** – Railway vergibt den Port automatisch; die App liest ihn
  (`process.env.PORT`) und lauscht darauf.
- Die **Manus/Forge-Variablen** (`BUILT_IN_FORGE_*`, `OAUTH_*`, `VITE_APP_ID`) bleiben
  **leer**. KI und Karten funktionieren dann (noch) nicht – der Kernbetrieb inkl.
  Datei-Speicher (bei gesetzten `S3_*`) läuft trotzdem (siehe README, „Umzug von Manus").

Nach dem Speichern der Variablen baut/startet Railway den App-Service neu.

### Erstes Admin-Konto (leere Installation)
Eine frische Datenbank hat noch kein Login. Setze **einmalig** diese Variablen, damit
beim Start ein Admin angelegt wird (nur solange noch kein Admin existiert):

| Variable | Beispiel |
|---|---|
| `SEED_ADMIN_EMAIL` | deine Admin-Adresse |
| `SEED_ADMIN_PASSWORT` | ein starkes Startpasswort (min. 8 Zeichen) |
| `SEED_ADMIN_NAME` | z. B. `Daniela Bergmann` (optional) |

Nach dem Redeploy einloggen. Danach **`SEED_ADMIN_PASSWORT` wieder entfernen** und das
Passwort im Portal ändern. Auf einem bereits befüllten System ist die Funktion wirkungslos.

## Phase 4 – Datenbank befüllen (Daten aus Manus übernehmen)

**A) Daten aus Manus exportieren:**
```bash
mysqldump --host=MANUS_HOST --port=3306 --user=MANUS_USER --password \
  --single-transaction --routines --default-character-set=utf8mb4 \
  MANUS_DBNAME > lebenswert-daten.sql
```

**B) Verbindungsdaten des Railway-MySQL holen:** MySQL-Dienst → **Variables/Connect**
zeigt Host, Port, User, Passwort, Datenbankname (öffentlich erreichbar über die
„Public Networking"-Adresse).

**C) In Railway importieren:**
```bash
mysql --host=RAILWAY_HOST --port=RAILWAY_PORT --user=RAILWAY_USER --password \
  RAILWAY_DBNAME < lebenswert-daten.sql
```

> Der Manus-Dump enthält **Schema und Daten**. Nur wenn du **ohne** Altdaten frisch
> startest, spielst du stattdessen `drizzle/baseline/0000_basisschema.sql` ein.

**D) Deploy neu auslösen** (falls nötig): App-Service → **Deploy**. Beim Start prüft
die App die Tabellen und ergänzt fehlende Strukturen automatisch (`ensureTables`).

## Phase 5 – Erreichbarkeit und eigene Domain

1. App-Service → **Settings → Networking → Generate Domain** → Railway gibt eine
   Test-URL (`*.up.railway.app`). Diese zuerst zum Testen nutzen.
2. Läuft alles, unter **Custom Domain** `portal.lebenswert-betreuung.de` eintragen.
   Railway zeigt einen **CNAME**-Zielwert an.
3. Beim **DNS-Anbieter** der Domain einen **CNAME**-Eintrag auf diesen Wert setzen.
   Erst **nach** erfolgreichem Test umstellen (kurze Nichterreichbarkeit möglich).

## Phase 6 – Prüfen (Checkliste)

- [ ] App-URL öffnet die Anmeldeseite
- [ ] Login mit einem bestehenden Konto funktioniert
- [ ] Kunden/Termine sind sichtbar (Daten korrekt übernommen)
- [ ] Admin → Kunden-CSV-Import: Bestandskunde wird als „↻ wird aktualisiert" erkannt
- [ ] Admin → Audit-Log: neue Einträge erscheinen
- [ ] **Bekannt eingeschränkt ohne Forge-Ersatz:** Unterschriften-/Backup-/Export-
      Dateien, KI-Funktionen, Karten (siehe README → „Manus/Forge-Abhängigkeiten")

---

## Häufige Stolpersteine

| Problem | Ursache / Lösung |
|---|---|
| App startet nicht, „DB not available" | `DATABASE_URL` fehlt oder nicht als `${{MySQL.MYSQL_URL}}`-Referenz gesetzt |
| Login schlägt nach Umzug fehl | `JWT_SECRET` weicht vom Manus-Wert ab → identisch setzen oder alle neu anmelden lassen |
| SMTP-Passwort „nicht entschlüsselbar" | anderer `JWT_SECRET`/`CREDENTIAL_ENCRYPTION_KEY` → SMTP-Daten neu eingeben |
| App nicht erreichbar, obwohl „deployed" | `PORT` war manuell gesetzt → entfernen, Railway vergibt ihn |
| Umlaute/Zeichen zerschossen | Import ohne `utf8mb4` → mit `--default-character-set=utf8mb4` neu importieren |
| Kosten | Railway ist ab dem Hobby-Plan kostenpflichtig; App + MySQL verbrauchen Ressourcen – Nutzung im Dashboard beobachten |

## Kosten (Stand grob)

Railway rechnet ressourcenbasiert ab; ein kleines Setup (App + MySQL) liegt
typischerweise im niedrigen zweistelligen Euro-Bereich pro Monat. Genaue Preise im
Railway-Dashboard prüfen.
