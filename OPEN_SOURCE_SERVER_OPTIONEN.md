# Offene Alternativen zu Railway für den Node-Server

## Ausgangslage

Für die gewählte Architektur liefert **Vercel das Mitarbeiterportal im Browser aus**. Ein zweiter, dauerhaft laufender Node-Server übernimmt die Fachlogik: Anmeldung, tRPC-API, Datenbankzugriffe, Datei-Uploads, Echtzeitinformationen und die neun automatischen Prüfungen.

Eine Open-Source-Alternative zu Railway ist keine zusätzliche Website, sondern eine **Server-Verwaltung**. Stellen Sie sie sich wie eine übersichtliche Schaltzentrale auf einem eigenen gemieteten Server vor. Sie behalten die Kontrolle über die Daten, sind aber auch für Updates, Backups und den Schutz dieses Servers verantwortlich.

## Geeignete Optionen

| Option | Was es ist | Gut geeignet, wenn Sie … | Zu beachten | Aufwand |
|---|---|---|---|---|
| **Coolify** | Freie Server-Schaltzentrale für Docker-Anwendungen | eine möglichst einfache Oberfläche, GitHub-Updates und Docker-Unterstützung möchten | eigener Server, Sicherheitsupdates und Backup-Konzept sind erforderlich | Mittel |
| **Dokploy** | Freie Docker-/Server-Schaltzentrale mit Datenbankverwaltung | eine moderne Verwaltungsoberfläche mit mehreren Diensten und Umgebungen möchten | benötigt einen ausreichend großen Server; die Dokumentation nennt mindestens 2 GB RAM und 30 GB Speicher | Mittel bis hoch |
| **CapRover** | Bewährte freie Server-Plattform auf Docker-Basis | Sie eine sehr flexible, technischere Lösung mit eigenen Subdomains nutzen möchten | mehr Ersteinrichtung: öffentlicher Server, Docker, offene Ports und Wildcard-DNS | Hoch |

Coolify kann Anwendungen direkt als Docker-Container ausführen, unterstützt GitHub-Repositories, Dockerfiles, automatische Bereitstellungen und Vorschauumgebungen.[1] Dokploy ist ebenfalls selbst gehostet und braucht laut eigener Dokumentation mindestens 2 GB Arbeitsspeicher sowie 30 GB Speicherplatz.[2] CapRover benötigt einen Server mit öffentlicher IP, Docker und für den üblichen HTTPS-Betrieb einen korrekt eingerichteten DNS-Bereich.[3]

## Einfache Entscheidungshilfe

| Wenn Ihnen besonders wichtig ist … | Passende Option |
|---|---|
| Möglichst einfache Bedienung und saubere GitHub-Updates | **Coolify** |
| Viele Serverdienste und Datenbanken über eine zentrale Oberfläche | **Dokploy** |
| Maximale technische Flexibilität und eigene Subdomain-Struktur | **CapRover** |

Für Ihr Portal ist **Coolify die einfachste Open-Source-Variante**, sofern Sie einen verwalteten Linux-Server in Deutschland oder der EU bereitstellen. Diese Einordnung ist keine automatische Auswahl: Dokploy bleibt sinnvoll, falls Sie später mehrere getrennte Dienste und Datenbanken über eine umfangreichere Serverzentrale pflegen möchten.

## Zielbild mit Coolify (Beispiel)

| Bereich | Aufgabe | Adresse-Beispiel |
|---|---|---|
| Vercel | Reagierende Portaloberfläche | `portal.lebenswert-betreuung.de` |
| Coolify-App | Dauerhafter Node-Server mit API, Uploads, SSE und automatischen Prüfungen | `api.lebenswert-betreuung.de` |
| MySQL | Fach- und Auditdaten | Nur intern erreichbar |
| S3-kompatibler EU-Speicher | Signaturen, Fotos, Backups, Dokumente | Nur über die App erreichbar |
| Coolify-Cron | Neun wiederkehrende Systemaufgaben | Keine öffentliche Benutzeradresse |

## Schrittfolge ohne Risiko

1. Einen Serveranbieter mit **EU-Rechenzentrum**, automatischen Backups und einer festen öffentlichen IP auswählen.
2. Coolify auf diesem Server installieren und für die Verwaltungsoberfläche eine separate Admin-Adresse mit HTTPS einrichten.
3. Den Node-Server aus dem GitHub-Repository als eigene Coolify-Anwendung bereitstellen. Dabei das vorhandene `Dockerfile` verwenden.
4. Eine MySQL-Datenbank und S3-Dateiablage verbinden. Erst nach einem vollständigen Daten- und Dateiimport darf der alte Speicher abgeschaltet werden.
5. Die API über `api.lebenswert-betreuung.de` testen. Die Vercel-Oberfläche erhält ausschließlich diese API-Adresse als Konfigurationswert.
6. Die neun automatischen Aufgaben als kurze, voneinander getrennte Aufgaben einrichten und je Aufgabe einen erfolgreichen Probelauf kontrollieren.
7. Eine **Staging-Adresse** testen: Admin-Login, Mitarbeiter-Login, Einsatzabschluss, Leistungsnachweis, Upload, Passwort-Reset und E-Mail-Versand.
8. Erst nach Ihrer ausdrücklichen Freigabe die Kunden-Domain auf die Vercel-Oberfläche umstellen.

## Wichtige Schutzregeln

> Der Server muss regelmäßig aktualisiert und gesichert werden. Ohne ein festes Backup und ohne Updates wäre eine eigene Server-Schaltzentrale für Gesundheits- und Mitarbeiterdaten nicht verantwortungsvoll.

| Schutzmaßnahme | Mindeststandard |
|---|---|
| Verwaltung | Eigene Admin-Adresse, starkes Passwort und Zwei-Faktor-Anmeldung |
| Netzwerk | Nur HTTPS nach außen; Datenbank nicht öffentlich freigeben |
| Sicherungen | Tägliche Datenbanksicherung und regelmäßiger Test einer Wiederherstellung |
| Dateien | EU-Standort, Zugriff nur über die App, keine öffentlichen Upload-Ordner |
| Geheimnisse | Nur als geschützte Variablen in Coolify, niemals in GitHub |
| Änderungen | Erst Staging testen, dann produktiv schalten |

## Quellen

[1]: https://coolify.io/docs/applications "Coolify – Applications"
[2]: https://docs.dokploy.com/docs/core/installation "Dokploy – Installation"
[3]: https://caprover.com/docs/get-started "CapRover – Getting Started"
