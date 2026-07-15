# Umsetzungskonzept: markierte Anforderungen aus dem Pflichtenheft

**Projekt:** Lebenswert Betreuung Portal  
**Stand:** 15. Juli 2026  
**Ziel:** Alle roten X- und gelb markierten Anforderungen werden in der bestehenden webbasierten App umgesetzt. Bei externen Diensten wird die technisch vollständige Portal-Anbindung vorbereitet; der Livebetrieb beginnt, sobald der jeweilige Anbieter Zugangsdaten, Freischaltung und gegebenenfalls Zertifizierung erteilt hat.

## 1. Architekturentscheidung

Das vorhandene Portal bleibt die einzige Benutzeroberfläche. Neue Funktionen werden als zusätzliche, rollenabhängige Seiten und als Erweiterungen bestehender Seiten eingebaut. Sensible Regeln werden immer im Server geprüft; das Ausblenden eines Menüpunktes allein gilt nicht als Sicherheit.

| Bereich | Umsetzung |
|---|---|
| Rollen | Vier Rollen: Administrator, Teamleitung, Buchhaltung, Mitarbeiter. Eine zentrale Berechtigungsmatrix steuert Module und Serveraktionen. |
| Sicherheit | TOTP-Zwei-Faktor-Anmeldung, Wiederherstellungscodes, kurze Sitzungen für sensible Rollen, Audit-Protokoll und verschlüsselte Integrationskonfiguration. |
| Daten | Erweiterung des bestehenden Drizzle-Schemas mit 2FA, Rollenrechten, Verfügbarkeiten, Besuchsberichten, Integrationen, Vorhersagen und Dokumentenfreigaben. |
| Echtzeit | In-App-Benachrichtigungen mit automatischer Aktualisierung; WebSocket-/SSE-Kanal für Änderungen und Polling als Rückfalllösung. |
| Automatisierung | Zeitgesteuerte Erinnerungen, Berichte und Prognosen über bestehende Scheduling-Infrastruktur. Externe Synchronisation läuft mit Status, Wiederholungen und Fehlerprotokoll. |
| Mobil | Alle Funktionen browserbasiert und mobile-first. Keine separate App erforderlich. |

## 2. Rollen- und Berechtigungskonzept

Die Rolle **Teamleitung** darf operative Planung, Kundenzuordnung, Einsatzfreigaben, Auslastung und Berichte verwalten, jedoch keine Systemeinstellungen, Integrationsschlüssel oder endgültigen Löschungen verändern. Die Rolle **Buchhaltung** erhält Zugriff auf Leistungsnachweise, Monatsabschlüsse, DATEV/Lexware/OptaData, Rechnungsdaten und Finanzberichte, jedoch nicht auf medizinische Freitexte außerhalb des Abrechnungszwecks.

| Modul/Aktion | Admin | Teamleitung | Buchhaltung | Mitarbeiter |
|---|---:|---:|---:|---:|
| Benutzer und Rollen | Vollzugriff | Lesen | Kein Zugriff | Eigenes Profil |
| Kunden und Zuordnung | Vollzugriff | Vollzugriff | Abrechnungsansicht | Zugeordnete/vertretende Kunden |
| Einsätze und Touren | Vollzugriff | Vollzugriff | Lesen | Eigene Einsätze |
| Leistungsnachweise | Vollzugriff | Prüfen/Freigeben | Freigeben/Export | Eigene erfassen |
| Buchhaltung/Exporte | Vollzugriff | Lesen | Vollzugriff | Kein Zugriff |
| Integrationen/API-Schlüssel | Vollzugriff | Status lesen | Fachliche Übertragung | Kein Zugriff |
| Analysen/Prognosen | Vollzugriff | Operative Analysen | Finanzanalysen | Eigene Kennzahlen |
| Endgültige Löschung | Mit 2FA-Bestätigung | Kein Zugriff | Kein Zugriff | Kein Zugriff |

## 3. Funktionspakete

### Paket A: Rollen, Sicherheit und Datenverwaltung

| Markierte Anforderung | Portalumsetzung | Abnahmekriterium |
|---|---|---|
| Zusätzliche Rollen | Teamleitung und Buchhaltung in Schema, Rollenverwaltung, Navigation und Serverberechtigung | Testkonten sehen nur erlaubte Bereiche; unerlaubte Serveraufrufe liefern 403 |
| Zwei-Faktor-Anmeldung | TOTP-Einrichtung mit QR-Code, sechsstelliger Code beim Login, Wiederherstellungscodes | Aktivierung, Login, falscher Code und Wiederherstellungscode getestet |
| Benutzerdefinierte Rechte | Berechtigungsmatrix je Rolle plus optionale Mitarbeiter-Ausnahmen | Admin kann Ausnahmen setzen; Änderungen werden protokolliert |
| Kunde löschen | DSGVO-konforme Archivierung als Standard; endgültige Löschung nur Admin, 2FA und Texteingabe zur Bestätigung | Verknüpfte Daten werden konsistent behandelt und Audit-Log erstellt |
| Unbegrenzte Kunden-/Mitarbeiterdaten | Serverseitige Pagination, Suche und Filter statt künstlicher Obergrenze | Listen laden schrittweise und bleiben bei großen Datenmengen bedienbar |
| Automatische Sicherung | Statusseite und Sicherungsprotokoll; Datenbank-Snapshot durch Hosting/Neon/TiDB-Sicherungsmechanismus | Letzter erfolgreicher Lauf und Fehlerstatus sichtbar |
| Datenschutzvereinbarung | Versionierte Dokumente, Zustimmung mit Zeitpunkt, Nutzer, IP-Hash und Dokumentversion | Neue Version erzwingt erneute Zustimmung |

### Paket B: Termine, Touren und Kommunikation

| Markierte Anforderung | Portalumsetzung | Abnahmekriterium |
|---|---|---|
| Navigation | Button öffnet Google Maps/Apple Maps mit Kundenadresse; Tour kann als Route geöffnet werden | Zieladresse stimmt und funktioniert mobil |
| Verfügbarkeit/Arbeitszeit | Wochenverfügbarkeit, Abwesenheiten, Sollstunden und Konfliktprüfung | Planung warnt vor Überschneidung und Nichtverfügbarkeit |
| Automatische Terminbestätigung | In-App, E-Mail und Push mit Bestätigen/Ablehnen | Reaktion wird am Einsatz gespeichert und Teamleitung informiert |
| Änderung/Absage | Änderungsgrund, Zeitstempel, Benachrichtigung und Historie | Betroffene Personen erhalten sofortige Meldung |
| Tourenoptimierung | Reihenfolge anhand Adressen, Zeitfenstern und Verfügbarkeit; manuelle Anpassung bleibt möglich | Optimierte Reihenfolge und geschätzte Fahrzeit werden angezeigt |
| Echtzeit-Updates | Ereigniskanal plus Rückfall-Polling für Benachrichtigungen und Planänderungen | Änderung erscheint ohne vollständiges Neuladen |
| E-Mail-Benachrichtigungen | SMTP-Provider über Serverkonfiguration, Vorlagen und Versandprotokoll | Testmail, Fehlerfall und erneuter Versand funktionieren |

### Paket C: Besuchsberichte, Dokumente und Auswertungen

| Markierte Anforderung | Portalumsetzung | Abnahmekriterium |
|---|---|---|
| Besuchsbericht mit Fotos | Bericht pro Einsatz, mehrere Fotos, Kategorien, Unterschriften und Freigabestatus | Upload, mobile Kamera, PDF-Ausgabe und Zugriffsschutz getestet |
| Formulare und individuelle Berichte | Formularvorlagen mit Felddefinitionen und Berichtsgenerator | Neue Vorlage ohne Codeänderung anlegbar |
| PDF-Generierung | Serverseitige PDF-Erstellung für Leistungsnachweise, Besuchsberichte, Datenschutz und Freigaben | PDF ist vollständig, druckbar und nachvollziehbar versioniert |
| Umsatzprognose | Prognose aus geplanten Einsätzen, Stundensätzen, Budget und historischen Leistungen | Monat/Quartal mit Ist-, Plan- und Prognosewerten |
| Mitarbeiter-Auslastung | Soll-/Ist-Stunden, verfügbare Kapazität, Fahrtanteil und Ampel | Filter nach Monat und Rolle, nachvollziehbare Berechnung |
| Kundenzuwachs | Neu, aktiv, beendet, Nettoentwicklung und Vergleichszeitraum | Monats- und Quartalsdiagramm |
| Pflegegradanalyse | Verteilung nach Pflegegrad, Entwicklung und Budgetwirkung | Filter und Export verfügbar |
| Wirtschaftliche Berichte | Umsatz, offene Leistungen, Budgetverbrauch, Fahrkosten und Personalkapazität | PDF/CSV-Export und rollenabhängiger Datenschutz |
| Pünktlichkeitsanalyse | Geplanter gegenüber tatsächlichem Start, Toleranz und Trend | Kennzahl pro Team/Mitarbeiter ohne unzulässige Dauerüberwachung |

### Paket D: Integrationen

| Markierte Anforderung | Portalumsetzung | Externe Voraussetzung |
|---|---|---|
| OptaData | Konfigurierbarer Connector, Übertragungswarteschlange, Status, Fehlerbehandlung und Dokumentexport | Vertrag, API-/DTA-Zugang, IK-Daten, Testfreischaltung |
| DATEV | Bestehenden CSV-Export um Arbeitnehmer-online-Zustimmung, Exporthistorie und optionalen API-Connector erweitern | DATEV-Produktfreischaltung und Berater-/Mandantendaten |
| Lexware | Bestehenden Export prüfen, Mapping und Exporthistorie ergänzen | Gewünschtes Lexware-Produkt und Importformat |
| Direkte Kassenanbindung | DTA-/API-Connector pro Kostenträger, Status, Vollmachtprüfung und Antwortimport | Zulassung/Zertifizierung, Kassenendpunkte und Schlüssel |
| Anbindung weiterer Systeme | Generische Integrationsverwaltung mit API-Schlüssel, Endpoint, Aktivstatus und Verbindungstest | Anbieter-Dokumentation und Zugangsdaten |
| Sprachassistent | Spracheingabe für Besuchsbericht und Suche; Text wird vor Speicherung angezeigt | Browser-Mikrofonfreigabe; optional externer Transkriptionsdienst |
| KI-Analysen | Regelbasierte Basisprognose plus optionales KI-Modell für Erklärtexte und Anomalien | Datenschutzfreigabe für gewählten Anbieter |
| Redis | Optionaler Cache/Job-Status; App bleibt ohne Redis funktionsfähig | Redis-URL für Produktion |

## 4. Datenmodell-Erweiterungen

| Tabelle/Erweiterung | Zweck |
|---|---|
| `mitarbeiter.rolle` | Enum um `teamleitung` und `buchhaltung` erweitern |
| `mitarbeiter` 2FA-Felder | Aktivstatus, verschlüsseltes TOTP-Geheimnis, Zeitpunkt der Aktivierung |
| `mitarbeiterBerechtigungen` | Optionale Rechte-Ausnahmen je Mitarbeiter |
| `zweiFaktorCodes` | Gehashte Wiederherstellungscodes, einmalig nutzbar |
| `verfuegbarkeiten` | Wochentag, Zeitfenster, Gültigkeit, Sollstunden |
| `einsatzAenderungen` | Änderungs-/Absagehistorie und Bestätigungsstatus |
| `besuchsberichte` | Inhalt, Zustand, Freigabe, Formularversion, Unterschriften |
| `besuchsberichtDateien` | Fotos und weitere Anhänge mit Metadaten |
| `formularVorlagen` | Versionierte, konfigurierbare Formularfelder |
| `integrationen` | Anbieter, Modus, Endpoint, Aktivstatus und verschlüsselte Konfiguration |
| `integrationsLaeufe` | Übertragungsstatus, Wiederholungen, fachliche Referenz und Fehlercode |
| `datenschutzDokumente` | Versionierte Vereinbarungen |
| `datenschutzZustimmungen` | Zustimmung je Nutzer und Version |
| `analyseSnapshots` | Vorberechnete Monatskennzahlen und Prognosewerte |
| `backupProtokolle` | Sicherungsstatus ohne Sicherungsinhalt |

## 5. Reihenfolge der Implementierung

Die Umsetzung erfolgt in sicheren Schichten. Zuerst werden Rollen, zentrale Berechtigungen, 2FA und Löschschutz implementiert, weil alle späteren Module davon abhängen. Danach folgen Verfügbarkeit, Terminreaktionen, Navigation, Berichte und Analysen. Abschließend werden externe Connectoren eingebaut und anhand von Test-/Sandbox-Zugängen aktiviert.

| Stufe | Inhalt | Ergebnis |
|---|---|---|
| 1 | Rollen, Berechtigungsmatrix, 2FA, Audit, Löschschutz | Sichere Grundlage |
| 2 | Verfügbarkeit, Terminstatus, Navigation, Benachrichtigungen | Operative Planung |
| 3 | Besuchsberichte, Fotos, Formulare, PDFs | Vollständige Dokumentation |
| 4 | Analysen, Prognosen, Exporte | Steuerung und Controlling |
| 5 | OptaData, DATEV, Lexware, Kassen, generische APIs | Externe Datenflüsse |
| 6 | Redis, Echtzeitkanal, Sprach-/KI-Funktionen, Backups | Leistung und Automatisierung |

## 6. Nicht durch Code allein freischaltbare Punkte

Eine technisch fertige Eingabemaske ist noch keine produktive Direktanbindung. OptaData, DATEV und Pflegekassen erfordern echte Vertragsdaten, Zugänge, Testumgebungen und teilweise Zulassungen. Das Portal wird deshalb so gebaut, dass alle Verbindungen in einem Integrationszentrum konfiguriert, getestet und überwacht werden können. Bis zur Freigabe bleiben die Connectoren im Modus **„Vorbereitet – Zugang fehlt“**, ohne falsche Erfolgsmeldungen oder simulierte Übertragungen.
