# Serverauswahl für Coolify: Vercel vorne, Fachserver hinten

## Was der Server für Sie übernimmt

Der Server ist der **Maschinenraum** Ihres Portals. Vercel zeigt den Mitarbeiterinnen die schnelle Oberfläche. Der neue Coolify-Server verarbeitet im Hintergrund Anmeldungen, Kundendaten, Leistungsnachweise, Signaturen, E-Mails, Uploads und die neun automatischen Prüfungen.

Damit die Staging-Version und später der Livebetrieb zuverlässig bleiben, wird zunächst **ein eigener Staging-Server** eingerichtet. Die Adresse `portal.lebenswert-betreuung.de` bleibt unangetastet, bis alle Tests bestanden sind.

## Mindeststandard für dieses Portal

Coolify selbst benötigt mindestens zwei CPU-Kerne, 2 GB Arbeitsspeicher und 30 GB freien Speicher. Für dieses Portal sollten Sie bewusst Reserven einplanen, weil zusätzlich Node-Server, MySQL-Datenbank, Docker-Images, Protokolle und Sicherungen arbeiten.[1]

| Bestandteil | Empfohlene Wahl | Warum |
|---|---|---|
| Server-Standort | **Deutschland** oder **Finnland** | Kurze Wege und europäische Datenverarbeitung |
| Betriebssystem | **Ubuntu 24.04 LTS** | Von Coolify direkt unterstützt und langfristig gepflegt |
| Prozessor | **4 virtuelle CPU-Kerne** | Reserve für Updates, Builds und parallele Portalzugriffe |
| Arbeitsspeicher | **8 GB RAM** | Stabiler Betrieb von Coolify, Node und MySQL auf einem Server |
| Speicher | **mindestens 160 GB NVMe/SSD** | Platz für Datenbank, Container, Logs und temporäre Dateien |
| Sicherung | **Tägliche Server-Backups aktivieren** | Schnelle Wiederherstellung bei Fehlbedienung oder Defekt |
| Externer Dateispeicher | **S3-kompatibel in EU** | Signaturen, Fotos und Dokumente liegen nicht nur auf dem Server |

> Die Server-Sicherung schützt den ganzen Rechner. Sie ersetzt **nicht** die eigene Datenbank- und Dateisicherung. Insbesondere angehängte Volumes sind bei vielen Anbietern nicht automatisch im Server-Backup enthalten.[2]

## Zwei geeignete Serveroptionen

| Option | Für wen passend | Konkrete Startauswahl | Vorteile | Besonderheit |
|---|---|---|---|---|
| **Hetzner Cloud** | Wenn Sie eine sehr klare Verwaltungsoberfläche und deutsche bzw. finnische Rechenzentren wünschen | Cloud-Server mit **4 vCPU, 8 GB RAM, 160 GB SSD/NVMe**, Ubuntu 24.04, Standort Nürnberg oder Falkenstein | Klare Verwaltung, Firewall, tägliche Backups, Snapshots | Backups aktivieren; Volumes separat sichern |
| **netcup VPS** | Wenn Sie hohe Speicherreserven und eine deutschsprachig bekannte VPS-Verwaltung bevorzugen | **VPS 1000 G12** oder größer mit 4 vCore, 8 GB RAM und 256 GB NVMe | Reichlich Speicher, Snapshots, Remote-Konsole | Sicherheits- und Updatebetrieb werden selbst verantwortet |

Hetzner betreibt Cloud-Standorte in Deutschland und Finnland; die deutschen und finnischen Rechenzentren sind nach ISO/IEC 27001 zertifiziert.[3] netcup nennt für den VPS 1000 G12 vier vCores, 8 GB RAM und 256 GB NVMe; die Größe passt als Ausgangspunkt zu diesem Portal.[4]

## Meine Empfehlung für den einfachen Start

Wenn Sie **möglichst wenige technische Entscheidungen** treffen möchten, wählen Sie **Hetzner Cloud** mit Standort **Nürnberg**, Ubuntu 24.04, 4 vCPU, 8 GB RAM und aktivierten Backups. Wenn Ihnen ein größeres Speicherpaket wichtiger ist und Sie die VPS-Verwaltung bereits kennen, ist netcup VPS 1000 G12 eine passende Alternative.

Diese Empfehlung löst noch **keine Bestellung aus**. Sie entscheiden vor dem Kauf ausdrücklich selbst.

## Klick-für-Klick: Hetzner Cloud als Staging-Server

1. Öffnen Sie [Hetzner Cloud Console](https://console.hetzner.cloud/) direkt im normalen Browser und legen Sie ein Projekt mit dem Namen **„Seniorenassistenz – Staging“** an.
2. Klicken Sie auf **„Add Server“**.
3. Wählen Sie **Location: Nürnberg** oder **Falkenstein**.
4. Wählen Sie als Image **Ubuntu 24.04 LTS**.
5. Wählen Sie einen Server mit **mindestens 4 vCPU, 8 GB RAM und 160 GB Speicher**.
6. Aktivieren Sie **Backups**. Erstellen Sie zusätzlich später vor jeder größeren Änderung einen manuellen Snapshot.
7. Aktivieren Sie die Firewall. Zu Beginn dürfen nur HTTPS (443), HTTP (80) und SSH (22) erreichbar sein. SSH wird danach auf Ihren festen Zugang begrenzt.
8. Geben Sie dem Server den Namen `seniorenassistenz-staging` und erstellen Sie ihn.
9. Speichern Sie die angezeigte IP-Adresse. Teilen Sie **niemals** ein Root-Passwort oder einen privaten SSH-Schlüssel im Chat.

## Was ich nach Ihrer Auswahl übernehme

| Schritt | Meine Aufgabe |
|---:|---|
| 1 | Server absichern und Coolify installieren |
| 2 | Coolify-Adminbereich mit eigener HTTPS-Adresse einrichten |
| 3 | GitHub-Repository als Staging-Anwendung anbinden |
| 4 | MySQL, EU-Dateiablage und geschützte Variablen verbinden |
| 5 | Vercel-Portal mit der Staging-API verbinden |
| 6 | Login, Uploads, PDFs, E-Mails und alle neun automatischen Aufgaben testen |
| 7 | Ihnen eine eindeutige Freigabe-Checkliste für die spätere Live-Domain vorlegen |

## Bevor Sie auf „Bestellen“ klicken

- [ ] Standort Deutschland oder Finnland gewählt
- [ ] Ubuntu 24.04 LTS gewählt
- [ ] Mindestens 4 vCPU, 8 GB RAM und 160 GB Speicher gewählt
- [ ] Tägliche Backups aktiviert
- [ ] Firewall-Funktion verfügbar
- [ ] Server ausschließlich als **Staging** bezeichnet
- [ ] Sie bestätigen danach nur die öffentliche IP-Adresse, keine Passwörter

## Quellen

[1]: https://coolify.io/docs/get-started/installation "Coolify – Installation und Ressourcenanforderungen"
[2]: https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/ "Hetzner – Backups und Snapshots"
[3]: https://www.hetzner.com/cloud/ "Hetzner Cloud – Standorte und Sicherheitsangaben"
[4]: https://www.netcup.com/en/server/vps "netcup – VPS-Ressourcen"
