# Railway-Betrieb: Seniorenassistenz Bernhardt

## Zielbild

**Railway ist das Livesystem.** Die Entwicklungsumgebung liefert ausschließlich geprüfte Änderungen in den Branch `main` des verbundenen GitHub-Repositories. Railway baut diesen Branch und stellt die neue Version bereit. Eine Manus-Domain oder ein Manus-Deployment ist für den Livebetrieb nicht erforderlich.

> Stellen Sie die Kunden-Domain erst um, wenn die Railway-Adresse mit dem Admin-Login erfolgreich geprüft wurde. So bleibt im Problemfall immer ein funktionierender Rückweg erhalten.

| Baustein | Aufgabe im Railway-Betrieb | Wichtig |
|---|---|---|
| App-Service | Stellt Portal, API und Anmeldung bereit | Von GitHub-Branch `main` bereitstellen |
| MySQL-Service | Speichert alle Fach- und Auditdaten | Vor dem Umschalten sichern und mit Bestand befüllen |
| S3-Dateiablage | Signaturen, Fotos, Backups und sichere Exporte | EU-Region und Zugangsdaten erforderlich |
| Cron-Services | Starten die neun wiederkehrenden Prüfungen | Je Aufgabe ein kurzer, eigener Service |
| Custom Domain | `portal.lebenswert-betreuung.de` | Erst nach App-Test verbinden |

## 1. App-Service aus GitHub verbinden

Erstellen Sie in Railway ein Projekt und wählen Sie **„New Project → Deploy from GitHub Repo“**. Wählen Sie anschließend das Repository `haimmanuel-coder/lebenswert-portal` und den Branch `main`. Railway kann GitHub-Repositories direkt bauen und nach einem neuen Commit erneut bereitstellen.[1]

Das Repository enthält bereits ein produktionsfähiges `Dockerfile`. Railway soll dieses verwenden. Der Dienst benötigt folgende Einstellungen:

| Railway-Einstellung | Wert |
|---|---|
| Build | Dockerfile automatisch erkennen lassen |
| Start Command | Docker-Standard beibehalten: `node dist/index.js` |
| Healthcheck | `/` |
| Deploy bei GitHub-Push | Aktiv |
| Öffentliche Adresse | Zunächst Railway-Domain erzeugen |

## 2. Variablen sicher hinterlegen

Öffnen Sie im App-Service **Variables** und hinterlegen Sie die Werte aus dem bisherigen sicheren Betrieb. Geheimnisse gehören nur in Railway Variables – nie in GitHub, Dokumente oder Chat-Nachrichten.

| Variable | Pflicht | Zweck |
|---|---:|---|
| `NODE_ENV` | Ja | `production` |
| `DATABASE_URL` | Ja | Verbindet die produktive MySQL-Datenbank |
| `JWT_SECRET` | Ja | Muss beim Datenumzug identisch bleiben, damit verschlüsselte SMTP-Daten lesbar bleiben |
| `CREDENTIAL_ENCRYPTION_KEY` | Empfohlen | Eigener Schlüssel für gespeicherte Integrationsdaten |
| `SCHEDULER_PROVIDER` | Ja | `railway` – verhindert die Manus-Heartbeat-Registrierung |
| `RAILWAY_CRON_SECRET` | Ja | Gleiches langes Geheimnis im App-Service und in jedem Cron-Service |
| `EXTERNAL_HOSTING` | Ja | `true` – entfernt das Manus-Laufzeitskript aus dem neuen Frontend-Build |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Ja | Eigene S3-kompatible Dateiablage |
| `S3_REGION`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | Je Anbieter | Ergänzende S3-Konfiguration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Für E-Mail | Passwort-Reset und E-Mail-Versand |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Bei Push | Web-Push-Benachrichtigungen |
| `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL` | Bei KI-Funktionen | OpenAI-kompatibler KI-Anbieter |
| `STT_API_URL`, `STT_API_KEY`, `STT_MODEL` | Bei Spracheingabe | Whisper-kompatibler Sprachdienst |
| `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | Bei Karten | Eigener Google-Maps-Zugang; `VITE_` gilt schon beim Build |

Für `SCHEDULER_TARGET_URL` verwenden Sie in **Cron-Services** die getestete Railway-App-Adresse, etwa `https://<ihre-app>.up.railway.app`. In den normalen App-Service gehört diese Variable nicht.

## 3. Datenbank und Dateien übernehmen

GitHub ist wie ein **Bauplan**. Die operative Datenbank und die gespeicherten Signaturen/Fotos sind darin nicht enthalten. Deshalb werden diese Schritte vor dem Domainwechsel durchgeführt:

1. Von der bisherigen MySQL-Quelle einen vollständigen, verschlüsselten Datenexport erstellen.
2. In Railway einen MySQL-Service oder eine bereits vorhandene externe MySQL-Instanz bereitstellen.
3. Den Export in die Ziel-Datenbank einspielen und die resultierende URL als `DATABASE_URL` im App-Service hinterlegen.
4. Die S3-Dateiablage in einer EU-Region konfigurieren. Bestehende Dateien aus dem bisherigen Speicher müssen einmalig übertragen werden, bevor alte Datenquellen abgeschaltet werden.
5. Die Railway-Adresse öffnen und sich mit einem bestehenden Admin-Konto anmelden. Erst dann darf die Custom Domain umgestellt werden.

## 4. Wiederkehrende Aufgaben als Railway-Cron-Services

Railway-Cron-Dienste sollen eine kurze Aufgabe ausführen und danach enden. Railway verwendet **fünf** Cron-Felder in UTC und erlaubt keine Intervalle unter fünf Minuten.[2] Jeder der folgenden Dienste erhält dieselbe Repository-Quelle sowie diese Variablen: `RAILWAY_CRON_SECRET`, `SCHEDULER_TARGET_URL` und bei Bedarf `DATABASE_URL`.

Als Start Command erhält jeder Cron-Service das Muster:

```text
pnpm cron:railway -- <aufgabenname>
```

| Aufgabenname | Railway-Cron (UTC) | Start Command |
|---|---|---|
| Führerschein-Erinnerung | `0 8 * * *` | `pnpm cron:railway -- fuehrerschein-erinnerung` |
| Neukunden-Eskalation | `0 9 * * *` | `pnpm cron:railway -- neukunden-eskalation` |
| Vertretungen bereinigen | `0 2 * * *` | `pnpm cron:railway -- vertretung-bereinigung` |
| Fahrtennachweise senden | `0 6 18 * *` | `pnpm cron:railway -- fahrtennachweise-versand` |
| Sicherheitsunterweisungen | `0 8 1 * *` | `pnpm cron:railway -- sicherheitsunterweisung-erinnerung` |
| Aufbewahrungsfristen | `0 7 1 * *` | `pnpm cron:railway -- aufbewahrungsfristen-pruefung` |
| Wöchentliches Backup | `0 3 * * 1` | `pnpm cron:railway -- backup-woechentlich` |
| Monatsabschluss-Erinnerung | `0 7 28 * *` | `pnpm cron:railway -- monatsabschluss-erinnerung` |
| Pflichtmitteilungen | `0 8 * * *` | `pnpm cron:railway -- pflichtmitteilungen-erinnerung` |

Die Zeitangaben sind UTC. Dadurch verschieben sich lokale Sommer-/Winterzeit-Zeitpunkte um eine Stunde. Für Termine mit fester deutscher Ortszeit empfiehlt sich eine fachliche Prüfung der gewünschten Sommerzeitbehandlung vor der finalen Einstellung.

## 5. Sicherer Updateablauf für jede neue Funktion

| Schritt | Was geschieht | Wer führt aus |
|---:|---|---|
| 1 | Änderung wird entwickelt, TypeScript geprüft und getestet | Entwicklung |
| 2 | Geprüfter Stand wird nach `main` in GitHub übertragen | Entwicklung |
| 3 | Railway erkennt den neuen Commit und baut die App | Railway |
| 4 | Railway-Domain, Login und der geänderte Bereich werden geprüft | Admin |
| 5 | Erst bei Erfolg bleibt die Version produktiv; bei Bedarf in Railway auf vorherigen Deploy zurückrollen | Admin / Entwicklung |

Die GitHub-Verbindung ist damit die **Brücke**, Railway die **Ladenfläche** und die Entwicklungsumgebung die **Werkstatt**. Aktualisierungen werden nicht mehr über eine Manus-URL an Mitarbeitende ausgeliefert.

## 6. Domain erst zum Schluss umstellen

Öffnen Sie im Railway-App-Service den Bereich **Networking → Custom Domain** und tragen Sie `portal.lebenswert-betreuung.de` ein. Railway zeigt danach den erforderlichen DNS-Eintrag an. Hinterlegen Sie exakt diesen Eintrag bei Ihrem Domainanbieter und warten Sie auf die SSL-Aktivierung.[3]

Vorherige Manus-DNS-Einträge dürfen erst entfernt werden, wenn der Railway-Login, ein Mitarbeiterlogin, Upload/Download sowie der erste Cron-Test erfolgreich waren.

## Abnahmecheck

- [ ] Railway-Domain zeigt die Mitarbeiter-Anmeldeseite.
- [ ] Admin- und Mitarbeiterlogin funktionieren mit vorhandenen Konten.
- [ ] Eine Datei kann hochgeladen und wieder geöffnet werden.
- [ ] Ein Cron-Service wird manuell gestartet und liefert einen erfolgreichen Logeintrag.
- [ ] Die Custom Domain zeigt dieselbe Railway-App mit gültigem SSL.
- [ ] Die Manus-Domain wird nicht mehr als Live-Adresse verwendet.

## Quellen

[1]: https://docs.railway.com/quick-start "Railway – Deployment aus GitHub"
[2]: https://docs.railway.com/cron-jobs "Railway – Cron Jobs"
[3]: https://docs.railway.com/networking/domains "Railway – Domains"
