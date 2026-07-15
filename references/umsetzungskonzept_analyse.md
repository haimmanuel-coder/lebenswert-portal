# Umsetzungskonzept – Analyse der markierten Anforderungen

Quelle: `/home/ubuntu/upload/UmsetzungskonzeptmarkierteAnforderungenausdemPflichtenheft.pdf`
Stand der Analyse: 15.07.2026

## 1. Architekturentscheidung

Das bestehende Portal bleibt die einzige Benutzeroberfläche. Neue Funktionen werden als zusätzliche, rollenabhängige Seiten und als Erweiterungen bestehender Seiten eingebaut. Sensible Regeln werden immer serverseitig geprüft. Das reine Ausblenden eines Menüpunktes gilt nicht als Sicherheit.

## 2. Rollen- und Berechtigungskonzept

Gefordert sind vier Rollen: **Administrator**, **Teamleitung**, **Buchhaltung**, **Mitarbeiter**.

Die Teamleitung darf operative Planung, Kundenzuordnung, Einsatzfreigaben, Auslastung und Berichte verwalten, aber keine Systemeinstellungen, Integrationsschlüssel oder endgültige Löschungen verändern.

Die Buchhaltung erhält Zugriff auf Leistungsnachweise, Monatsabschlüsse, DATEV/Lexware/OptaData, Rechnungsdaten und Finanzberichte, jedoch nicht auf medizinische Freitexte außerhalb des Abrechnungszwecks.

Die Matrix im Dokument fordert zusätzlich:
- Teamleitung: Lesen oder Vollzugriff je nach Modul
- Buchhaltung: Vollzugriff auf Buchhaltung/Exporte, fachliche Übergabe bei Integrationen
- Endgültige Löschung: nur Admin mit 2FA-Bestätigung

## 3. Funktionspakete

### Paket A – Rollen, Sicherheit und Datenverwaltung
- Zusätzliche Rollen Teamleitung und Buchhaltung in Schema, Rollenverwaltung, Navigation und Serverberechtigung
- TOTP-Zwei-Faktor-Anmeldung mit QR-Code, 6-stelligem Code beim Login und Wiederherstellungscodes
- Benutzerdefinierte Rechte: Rollenmatrix plus optionale Mitarbeiter-Ausnahmen
- Kunde löschen: DSGVO-konforme Archivierung als Standard; endgültige Löschung nur Admin, 2FA und Texteingabe zur Bestätigung
- Unbegrenzte Kunden-/Mitarbeiterdaten: serverseitige Pagination, Suche und Filter statt künstlicher Obergrenze
- Automatische Sicherung: Statusseite und Sicherungsprotokoll; Snapshot über Hosting/Neon/TiDB-Sicherung, letzter erfolgreicher Lauf und Fehlerstatus sichtbar
- Datenschutzvereinbarung: versionierte Dokumente, Zustimmung mit Zeitpunkt, Nutzer, IP-Hash und Dokumentversion; neue Version erzwingt erneute Zustimmung

### Paket B – Termine, Touren und Kommunikation
- Navigation: Google Maps/Apple Maps Button mit Kundenadresse; Tour als Route mobil öffnen
- Verfügbarkeit/Arbeitszeit: Wochenverfügbarkeit, Abwesenheiten, Sollstunden und Konfliktprüfung
- Automatische Terminbestätigung: In-App, E-Mail und Push mit Bestätigen/Ablehnen
- Änderung/Absage: Änderungsgrund, Zeitstempel, Benachrichtigung und Historie
- Tourenoptimierung: Reihenfolge anhand Adressen, Zeitfenstern und Verfügbarkeit; manuelle Anpassung bleibt möglich
- Echtzeit-Updates: Ereigniskanal plus Fallback-Polling für Benachrichtigungen und Planänderungen
- E-Mail-Benachrichtigungen: SMTP-Provider über Serverkonfiguration, Vorlagen und Versandprotokoll

### Paket C – Besuchsberichte, Dokumente und Auswertungen
- Besuchsbericht mit Fotos: Bericht pro Einsatz, mehrere Fotos, Kategorien, Unterschriften und Freigabestatus
- Formulare und individuelle Berichte: Formularvorlagen mit Felddefinitionen und Berichtsgenerator
- PDF-Generierung: serverseitige PDFs für Leistungsnachweise, Besuchsberichte, Datenschutz und Freigaben
- Umsatzprognose: Prognose aus geplanten Einsätzen, Stundensätzen, Budget und historischen Leistungen
- Weitere Analysepunkte aus der Folgeseite: Mitarbeiter-Auslastung, Kundenzuwachs, Pflegegradanalyse, wirtschaftliche Berichte, Pünktlichkeitsanalyse

### Paket D – Integrationen
- OptaData: konfigurierbarer Connector mit Übertragungswarteschlange, Status, Fehlerbehandlung und Dokumentexport
- DATEV: Export um Arbeitnehmer-online-Zustimmung, Exporthistorie und optionalen API-Connector erweitern
- Lexware: bestehenden Export prüfen, Mapping und Exporthistorie ergänzen
- Direkte Kassenanbindung: DTA/API-Connector pro Kostenträger, Status, Vollmachtprüfung und Antwortimport
- Weitere Systeme: generische Integrationsverwaltung mit API-Schlüssel, Endpoint, Aktivstatus und Verbindungstest
- Sprachassistent: Spracheingabe für Besuchsbericht und Suche; Textvorschau vor Speichern
- KI-Analysen: regelbasierte Basisprognose plus optionales KI-Modell für Erklärtexte und Anomalien
- Redis: optionaler Cache/Job-Status; App bleibt ohne Redis funktionsfähig

## 4. Datenmodell-Erweiterungen

Geforderte zusätzliche Tabellen/Felder:
- `mitarbeiter.rolle` um `teamleitung` und `buchhaltung` erweitern
- Mitarbeiter-2FA-Felder
- `mitarbeiterBerechtigungen`
- `zweiFaktorCodes` (Wiederherstellungscodes)
- `verfuegbarkeiten`
- `einsatzAenderungen`
- `besuchsberichte`
- `besuchsberichtDateien`
- `formularVorlagen`
- `integrationen`
- `integrationsLaeufe`
- `datenschutzDokumente`
- `datenschutzZustimmungen`
- `analyseSnapshots`
- `backupProtokolle`

## 5. Reihenfolge der Implementierung laut Konzept

1. Rollen, Berechtigungsmatrix, 2FA, Audit, Löschschutz
2. Verfügbarkeit, Terminstatus, Navigation, Benachrichtigungen
3. Besuchsberichte, Fotos, Formulare, PDFs
4. Analysen, Prognosen, Exporte
5. OptaData, DATEV, Lexware, Kassen, generische APIs
6. Redis, Echtzeitkanal, Sprach-/KI-Funktionen, Backups

## 6. Nicht allein per Code freischaltbar

Das PDF weist ausdrücklich darauf hin, dass OptaData, DATEV und Pflegekassen-Schnittstellen reale Verträge, Zugangsdaten, Testumgebungen und teilweise Zertifizierungen brauchen. Das Portal soll diese Verbindungen vollständig vorbereiten, aber bis zur Freigabe sichtbar im Status **„vorbereitet – Zugang fehlt“** bleiben, ohne falsche Erfolgsmeldungen oder simulierte Übertragungen.

## 7. Konsequenz für die Umsetzung in der App

Der Schwerpunkt der nächsten Umsetzungsrunde liegt auf:
1. Rollen-/Rechtemodell mit 2FA und Löschschutz.
2. Verfügbarkeiten, Terminbestätigungen, Absagehistorie und Karten-/Navigationsverbesserungen.
3. Besuchsbericht-Modul mit Fotos, Vorlagen und serverseitigen PDFs.
4. Analyse-, Prognose-, Export- und Integrations-Backoffice.
5. Sichtbarer Integrationsstatus statt vorgetäuschter Live-Anbindungen.

