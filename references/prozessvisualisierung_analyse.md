# Analyse der Prozessvisualisierung „Lebensnah Betreuung"

Quelle: `/home/ubuntu/upload/prozessvisualisierung_lebenswertBetreuung.pdf`

## Bereits erkannte Kernaussagen aus den gelesenen Seiten

### Prozess 1 – Neukunden-Onboarding
- Pflichtfelder im digitalen Anamnesebogen: **Name, Adresse, Pflegegrad, 2 Wunschtage**
- Nach erfolgreicher Budgetprüfung wird der Status auf **budgetgeprüft** gesetzt.
- Wenn der Vertrag unterschrieben ist, wird der Kunde auf **aktiv** gesetzt.
- Danach erfolgt ein **Neukunden-Push an alle Mitarbeiter**.
- Wenn innerhalb von **24 Stunden** keine Bestätigung erfolgt, muss ein **erneuter Push** ausgelöst werden.
- Wenn innerhalb von **48 Stunden** weiterhin keine Bestätigung erfolgt, muss ein **Admin-Alert** entstehen.
- Bei Bestätigung wird ein **Gesehen-Status protokolliert** und die **Tourenplanung freigeschaltet**.

### Prozess 2 – Urlaubs-Vertretungsworkflow
- Nach Genehmigung eines Urlaubsantrags identifiziert das System die betroffenen Kunden.
- Es geht ein **DSGVO-Push an alle Mitarbeiter**.
- Der Push enthält nur Mindestdaten: **Name, Vorname, Geburtsdatum, Straße, Pflegegrad**.
- Erst nach aktiver Übernahme-Bestätigung eines Mitarbeiters wird der **Vollzugriff** freigeschaltet.
- Bei Nicht-Bestätigung bleibt der Zugriff gesperrt.
- Bei Bestätigung werden gespeichert: **Übernahme-Bestätigung**, **Audit-Log mit Zeitstempel und IP**, **Admin-Hinweis über Übernahme**.

## Abgleich mit dem aktuellen Portalstand

### Bereits vorhanden
- Fahrtenbuch-Löschfunktion mit Sicherheitsabfrage
- Kalenderbasierte Tourenplanung mit Erstellen, Verschieben und Bearbeiten
- Mitarbeiter-Self-Service: Profil-Stammdaten bearbeiten
- Mitarbeiter-Self-Service: eigenes Passwort ändern
- Personalbogen-PDF in Mitarbeiterdetail
- DSGVO-Vertretungs-Grundlogik
- Neukunden-Push-Grundlogik

### Noch gezielt zu prüfen bzw. zu ergänzen
- Personalbogen-Button wirklich nur für Admin sichtbar machen
- Vollständigen Web-Flow für Neukunden-Onboarding ergänzen (Webformular / Anamnesebogen)
- 24h/48h-Eskalation technisch sauber vervollständigen
- Audit-Log um IP/Detailtiefe bei Vertretungsübernahme prüfen/ergänzen
- Weitere Prozessseiten des PDFs (P3–P5) vollständig gegen den Ist-Stand abgleichen

## Weitere Kernaussagen aus den gelesenen Seiten 9–13

### Prozess 2 – Ende des Vertretungsworkflows
- Nach bestätigter Übernahme wird temporär freigeschaltet: **Telefon, Diagnosen, Kostenträger, Einsatz-Historie**.
- Bankdaten bleiben dauerhaft gesperrt.
- Nach Urlaubsende erfolgt eine **automatische Bereinigung**.
- Dabei werden **Zugriffsrechte entzogen**, die **Zuordnung auf inaktiv statt gelöscht** gesetzt und der **Admin erhält eine Abschluss-Nachricht**.

### Prozess 3 – Einsatz-Durchführung & Nachbereitung
- Der Einsatz startet über **Timer / digitale Zeiterfassung**.
- Wenn die Zeit unter **1,5 Stunden** liegt, geht zunächst eine **Push-Warnung an den Mitarbeiter**.
- Bei der **3. Unterschreitung in Folge** muss zusätzlich ein **Admin-Alert / Dashboard-Hinweis** entstehen.
- Der Einsatz wird trotzdem abgeschlossen.
- Pflichtfelder im Einsatzbericht: **Verlauf, Vorkommnisse, Gesundheitsstatus**.
- Danach folgen **digitale Mitarbeiter-Unterschrift** und Weiterverarbeitung.

## Nächste technische Prüf- und Umsetzungsfelder
- Admin-Guard für Personalbogen-Button absichern
- Wiederholungs-Push nach 24h / Admin-Alert nach 48h technisch automatisieren
- Mitarbeiter-Warnhinweis bei Unterschreitung unter 1,5h nicht nur im Backend, sondern auch im aktiven Abschluss-Flow sichtbar machen
- Rechtebereinigung nach Urlaubsende und Admin-Abschlussmeldung gegen Ist-Stand prüfen
- Webformular / digitaler Anamnesebogen für Neukundenprozess ergänzen
