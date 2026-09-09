# Vercel: Vorgehensweise für das Mitarbeiterportal

## Kurz gesagt

Vercel kann die App aus dem GitHub-Repository automatisch aktualisieren. Für dieses Portal sind jedoch **drei zusätzliche Bausteine** nötig: eine externe MySQL-Datenbank, eine europäische Dateiablage für Signaturen und Dokumente sowie eine sichere Zeitsteuerung für die neun automatischen Prüfungen.

> Stellen Sie die Domain `portal.lebenswert-betreuung.de` erst um, wenn ein bestehender Admin-Login, ein Mitarbeiter-Login, ein Datei-Upload und mindestens eine automatische Aufgabe auf der neuen Adresse erfolgreich geprüft wurden.

Vercel führt Express-Anwendungen als skalierende Funktionsumgebung aus. Das ist sehr gut für Portalaufrufe und tRPC-API-Anfragen geeignet. Der bisherige Express-Server muss für einen ausschließlichen Vercel-Betrieb allerdings in eine Vercel-kompatible API-Struktur überführt werden.[1]

## Die zwei sinnvollen Varianten

| Variante | So funktioniert sie | Vorteile | Zu beachten | Aufwand |
|---|---|---|---|---|
| **A. Vollständig auf Vercel** | Benutzeroberfläche und API laufen als Vercel-Funktionen; MySQL, S3 und E-Mail liegen bei externen Diensten | Eine zentrale Plattform für Website, Vorschauen und Domain | Der vorhandene Express-Server, Uploads, Echtzeitkanal und neun Aufgaben müssen angepasst werden | Hoch |
| **B. Vercel vorne, bestehender Node-Server hinten** | Vercel liefert die Oberfläche aus; API, Uploads, Echtzeit und Aufgaben laufen auf einem Node-Host | Weniger Umbau, bewährte Fachlogik bleibt erhalten | Zwei verbundene Bausteine; sichere API-Domain und Cookie-Regeln erforderlich | Mittel |

Für beide Varianten bleibt **GitHub `main` die Aktualisierungsquelle**. Jeder geprüfte Merge startet eine neue Bereitstellung. Vercel kann Projekte direkt aus einem GitHub-Repository importieren und nach jedem Push aktualisieren.[2]

## Variante A: Alles auf Vercel

Diese Variante ist ein Neubau des technischen Fundaments, nicht der fachlichen Portaloberfläche. Die vorhandenen Seiten, Datenmodelle und Geschäftsregeln bleiben erhalten; der dauerhafte Serverbetrieb wird durch Vercel-Funktionen ersetzt.

| Baustein | Notwendige Anpassung |
|---|---|
| Express-Server | App als exportierbare Vercel-API bereitstellen statt selbst auf einem Port zu lauschen |
| Statische Oberfläche | Vite-Build als Vercel-Output ausliefern |
| Datenbank | Externe MySQL-Instanz per `DATABASE_URL` verbinden; keine lokale oder Manus-Datenbank |
| Dateiablage | S3-kompatiblen Speicher in EU-Region mit `S3_*`-Variablen verwenden |
| Login / Sitzungen | Bestehende Passwort-Anmeldung behalten, Cookie-Sicherheit für die neue Domain prüfen |
| Echtzeit | SSE-Verhalten auf Vercel-Laufzeiten testen; bei langen Verbindungen Ersatzweg vorsehen |
| Automatische Aufgaben | Neun Vercel-Cron-Routen via `vercel.json` registrieren und mit `CRON_SECRET` schützen |

Vercel-Cron ruft geplante Aufgaben als **HTTP-GET** auf und nutzt UTC-Zeiten. Vercel übermittelt bei gesetztem `CRON_SECRET` ein Bearer-Token im `Authorization`-Header.[1] [3] Der bisherige Railway-Cron-Starter ist deshalb nicht für diese Variante zu verwenden.

## Variante B: Vercel für die Oberfläche, Node-Server für Fachbetrieb

Diese Variante trennt Schaufenster und Maschinenraum. Vercel liefert die schnelle, öffentliche Benutzeroberfläche. Ein dauerhafter Node-Host führt die vorhandene API, Uploads, E-Mail-Auslösung, SSE und die neun zeitgesteuerten Aufgaben aus.

| Bereich | Adresse | Aufgabe |
|---|---|---|
| Mitarbeiterportal | `portal.lebenswert-betreuung.de` | Oberfläche über Vercel |
| Fach-API | z. B. `api.lebenswert-betreuung.de` | Login, tRPC, Uploads, Datenbankzugriff |
| Datenbank | Kein öffentlicher Browserzugriff | MySQL mit verschlüsselter Verbindung |
| Dateiablage | Kein direkter Klartextzugriff | S3-kompatibler EU-Speicher |

Diese Variante benötigt eine gezielte Cookie- und CORS-Konfiguration, damit Anmeldungen zwischen Portal- und API-Adresse sicher funktionieren. Sie ist daher nicht einfach „Vercel einschalten“, aber sie vermeidet eine umfangreiche Umstellung der bestehenden Serverlogik.

## Klick-Anleitung: Vercel mit GitHub verbinden

1. Öffnen Sie [vercel.com/new](https://vercel.com/new) in einem normalen Browserfenster und melden Sie sich mit **demselben GitHub-Konto** an, das das Repository enthält.
2. Klicken Sie auf **„Add New…“ → „Project“**.
3. Wählen Sie bei **Import Git Repository** das Repository `haimmanuel-coder/lebenswert-portal` aus.
4. Wählen Sie den Branch **`main`** aus. Dieser Branch enthält nur geprüfte Änderungen.
5. **Klicken Sie noch nicht auf „Deploy“**, bevor die gewählte Variante und die Variablen vorbereitet sind.

## Variablen: Was vor dem ersten Deploy nötig ist

Geheimnisse werden ausschließlich im Bereich **Settings → Environment Variables** hinterlegt. Sie gehören nie in GitHub oder in eine Textnachricht. Vercel stellt Variablen sowohl beim Build als auch zur Laufzeit bereit; bei Docker-Builds müssen Build-Variablen zusätzlich mit `ARG` im Dockerfile freigegeben werden.[4]

| Variable | Für Vercel nötig | Warum |
|---|---:|---|
| `DATABASE_URL` | Ja | Verbindung zur externen MySQL-Datenbank |
| `JWT_SECRET` | Ja | Muss beim Umzug identisch bleiben, damit bestehende Sitzungen und verschlüsselte Zugangsdaten sauber behandelt werden |
| `CREDENTIAL_ENCRYPTION_KEY` | Empfohlen | Separater Schlüssel für gespeicherte Zugangsdaten |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Ja, bei Dateien | Signaturen, Fotos, Backups und Exporte |
| `S3_REGION`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | Je Speicheranbieter | Ergänzende Speicherparameter |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Bei E-Mail | Passwort-Reset und Nachrichtenversand |
| `CRON_SECRET` | Bei Variante A | Schützt alle Vercel-Cron-Aufrufe |
| `LLM_*`, `STT_*`, `GOOGLE_MAPS_API_KEY` | Wenn genutzt | Ersatz für Manus-Dienste |
| `VITE_GOOGLE_MAPS_API_KEY` | Bei Karten | Schlüssel für die Browser-Karte |

## Daten- und Dateiumzug

GitHub ist vergleichbar mit dem Bauplan eines Hauses. Kundendaten, Mitarbeiterdaten, Audit-Protokolle, Signaturen und Passwörter stehen **nicht** im Bauplan.

1. Exportieren Sie die bisherige MySQL-Datenbank vollständig und verschlüsselt.
2. Stellen Sie die Ziel-MySQL-Instanz bereit und importieren Sie den Bestand.
3. Übertragen Sie Signaturen, Fotos, Backups und Exportdateien in einen EU-basierten S3-Speicher.
4. Setzen Sie die oben genannten Variablen in Vercel.
5. Prüfen Sie die Vercel-Vorschauadresse mit bestehenden Logins.
6. Erst nach erfolgreichem Test wird die Kunden-Domain umgestellt.

## Domain erst nach erfolgreichem Test

Öffnen Sie in Vercel **Project → Settings → Domains → Add Domain** und tragen Sie `portal.lebenswert-betreuung.de` ein. Vercel zeigt den nötigen DNS-Eintrag an. Für eine Subdomain wird in der Regel ein CNAME-Eintrag beim Domainanbieter hinterlegt; verwenden Sie immer exakt den von Vercel angezeigten Zielwert.[5]

## Empfohlene Reihenfolge

| Schritt | Ergebnis |
|---:|---|
| 1 | Sie wählen Variante A oder B. |
| 2 | Ich bereite den dazugehörigen Code und die sichere Konfiguration vor. |
| 3 | Vercel wird mit GitHub `main` verbunden. |
| 4 | Datenbank, S3-Dateiablage und Geheimnisse werden hinterlegt. |
| 5 | Die Vorschauadresse wird mit echten Logins und Uploads getestet. |
| 6 | Die automatische Zeitsteuerung wird getestet. |
| 7 | Erst dann wird `portal.lebenswert-betreuung.de` auf Vercel umgestellt. |

## Quellen

[1]: https://vercel.com/kb/guide/ship-a-express-app-on-vercel "Vercel – Express-Anwendungen bereitstellen"
[2]: https://vercel.com/docs/getting-started-with-vercel "Vercel – Einstieg und Git-Deployments"
[3]: https://vercel.com/docs/cron-jobs "Vercel – Cron Jobs"
[4]: https://vercel.com/guides/build-time-vs-runtime-secrets "Vercel – Build- und Laufzeitvariablen"
[5]: https://vercel.com/docs/domains/working-with-domains/add-a-domain "Vercel – Custom Domains"
