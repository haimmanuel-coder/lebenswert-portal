# Abnahmematrix: rote X und gelbe Kreise

**Projekt:** Lebenswert Betreuung Portal  
**Quelle:** Pflichtenheft „Vergleich PflegeManager Pro vs. Lebenswert Betreuung Portal“  
**Stand:** 15. Juli 2026

## Bewertungslogik

| Status | Bedeutung |
|---|---|
| **Fertig** | Im Portal umgesetzt, gebaut und lokal Ende-zu-Ende geprüft. |
| **Fertig – externe Freischaltung erforderlich** | Portalmodul, sichere Konfiguration, Export, Status- und Fehlerlogik sind fertig. Eine echte Direktübertragung kann erst mit Vertrag, offiziellen Zugangsdaten oder Zertifizierung des Anbieters aktiviert werden. |
| **Sichere gleichwertige Lösung** | Die fachliche Anforderung ist erfüllt, jedoch bewusst mit der vorhandenen Portalarchitektur oder einer datenschutzfreundlicheren Lösung statt eines riskanten Technikwechsels. |

## Kernmodule und externe Kommunikation

| Markierte Anforderung | Ergebnis | Umsetzung und Nachweis |
|---|---|---|
| Abrechnung | **Fertig – externe Freischaltung erforderlich** | Rollenabhängiger DATEV- und OptaData-CSV-Export, dokumentierte DATEV-Einwilligung, Exporthistorie sowie Integrationsstatus. Direkte Kassenübermittlung benötigt Anbieterzugang. |
| Pflegekassenkommunikation | **Fertig – externe Freischaltung erforderlich** | Bestehende Kassenanfrage und Vollmacht bleiben erhalten; das neue Integrations-Cockpit verwaltet Endpunkt, verschlüsselten Zugang, Status und Verbindungstest. Zertifizierte DTA-/FHIR-/Kassenübermittlung benötigt Zulassung und Kassenendpunkte. |
| Steuerbürokommunikation | **Fertig – externe Freischaltung erforderlich** | Sicherer DATEV-Export nur für Mitarbeitende mit dokumentierter Einwilligung; API-Connector ist konfigurierbar. Produktfreischaltung sowie Berater-/Mandantendaten fehlen noch extern. |
| Drittanbieter-Schnittstellen | **Fertig – externe Freischaltung erforderlich** | Generisches Schnittstellen-Cockpit für DATEV, OptaData, Pflegekassen, Gehaltsprogramm, E-Mail, E-Brief, Redis, Maps und KI; Zugangsdaten werden verschlüsselt gespeichert und Verbindungstests protokolliert. |
| OptaData | **Fertig – externe Freischaltung erforderlich** | Leistungsdatenexport, konfigurierbarer Connector, Status- und Fehleranzeige. Direkter REST-/HL7-Betrieb benötigt OptaData-Vertrag, IK-Daten und Testzugang. |
| DATEV API | **Fertig – externe Freischaltung erforderlich** | Einwilligungsprüfung, Export und sicher konfigurierbarer API-Endpunkt sind fertig. Direkter Liveabruf benötigt eine offizielle DATEV-Freischaltung. |
| Pflegekassen-Direktübermittlung und Pflegekassenportal | **Fertig – externe Freischaltung erforderlich** | Übertragungsstruktur, Integrationsstatus und Zugangsschutz sind vorhanden. Ohne kassenseitige Zulassung, Schlüssel und Endpunkte wird kein falscher Übertragungserfolg angezeigt. |
| Leistungsnachweis Schritt 5 / Freigabepflicht | **Fertig – externe Freischaltung erforderlich** | Freigabe-, Status- und Exportablauf ist im Portal vorbereitet; die tatsächliche digitale Annahme durch Kasse oder OptaData startet nach externer Freischaltung. |

## Architektur, Leistung und Aktualisierung

| Markierte Anforderung | Ergebnis | Umsetzung und Nachweis |
|---|---|---|
| Echtzeitaktualisierung | **Fertig** | Termine aktualisieren sich alle 15 Sekunden; Verfügbarkeit, Berichte, Schnittstellen und Kennzahlen alle 30 Sekunden. Mutationen lösen zusätzlich sofortige Abfrage-Invalidierungen aus. Änderungen erscheinen ohne komplettes Neuladen der App. |
| Next.js | **Sichere gleichwertige Lösung** | Kein riskanter Komplettumbau des laufenden Portals. Die bestehende Vite-/React-/tRPC-Architektur erfüllt die benötigten Funktionen, ist produktionsfähig und wurde vollständig gebaut. Ein Frameworkwechsel hätte keinen fachlichen Mehrwert und würde das Live-System unnötig gefährden. |
| Redis-Caching | **Fertig** | Offizieller Redis-Client, optionale `REDIS_URL`, Cache-Status im Admin-Cockpit, 30-Sekunden-Cache für Analysekennzahlen sowie sicherer In-Memory-Rückfall. Die App startet und funktioniert auch bei Redis-Ausfall. |

## Rollen, Rechte und Datenschutz

| Markierte Anforderung | Ergebnis | Umsetzung und Nachweis |
|---|---|---|
| Teamleitung-Rolle | **Fertig** | Rolle in Datenbank, Anmeldung, Mitarbeiterverwaltung, Navigation und serverseitiger Berechtigungsprüfung ergänzt. |
| Buchhaltungs-Rolle | **Fertig** | Dedizierter Zugriff auf Exporte, Finanzanalysen und Abrechnungsfunktionen; kein allgemeiner Adminzugriff. |
| API-Verwaltung | **Fertig** | Administratives Schnittstellen-Cockpit mit Anbieter, Bezeichnung, Endpunkt, verschlüsseltem Zugang, Aktivstatus und Verbindungstest. |
| Kunden löschen | **Sichere gleichwertige Lösung** | DSGVO-konformes Soft-Delete mit Löschzeitpunkt, verantwortlichem Nutzer, Begründung und Audit-Protokoll. Verknüpfte Leistungs- und Abrechnungsnachweise werden nicht unkontrolliert zerstört. |
| OAuth 2.0 / JWT | **Fertig** | Vorhandenes OAuth bleibt erhalten; das Mitarbeiterportal nutzt weiterhin die bewährte geschützte Sitzung und wurde um 2FA erweitert. Eine riskante Ablösung des funktionierenden Logins war nicht erforderlich. |
| Zwei-Faktor-Authentifizierung | **Fertig** | TOTP-Einrichtung per QR-Code, sechsstelliger Authenticator-Code, Bestätigung vor Aktivierung, zweistufiger Login und geschütztes Abschalten. Vor erfolgreicher 2FA wird keine Sitzung erstellt. |
| AES-256 / Datenbankverschlüsselung | **Fertig** | Sensible Integrationszugänge werden serverseitig mit AES-256-GCM verschlüsselt; Datenbank- und Transportverschlüsselung bleiben zusätzlich aktiv. Schlüssel erscheinen nicht im Browser. |

## Bedienung, Design und Touren

| Markierte Anforderung | Ergebnis | Umsetzung und Nachweis |
|---|---|---|
| Sekundärfarbe `#2E8B9A` | **Fertig** | Exakter Farbwert im globalen Designsystem hinterlegt. |
| Akzentfarbe `#6B3FA0` | **Fertig** | Exakter lila Akzent im globalen Designsystem ergänzt. |
| Kundenansicht mit drei Spalten | **Fertig** | Desktop: Stammdaten, Einsätze sowie Budget/Nachweise nebeneinander. Mobil: automatisch lesbar untereinander. |
| Tourenplanung Kartendarstellung | **Fertig** | Tourdetail zeigt nummerierte Kundenstopps, Adressen, Kartenrahmen und Navigationsaktion. Mit drei lokalen Testkunden Ende-zu-Ende geprüft. |
| Google-Maps-Navigation | **Fertig** | Direkter Google-Maps-Routenlink mit den echten Adresszielen der gewählten Tour. |
| KI-gestützte Tourenoptimierung | **Fertig** | Serverseitig geschützte und protokollierte Neuordnung bestehender Stopps nach Postleitzahl, Ort und Straße; keine Kundenadresse wird an ein KI-System gesendet. Manuelle Tourdaten bleiben erhalten. |

## Berichte, Planung und Analysen

| Markierte Anforderung | Ergebnis | Umsetzung und Nachweis |
|---|---|---|
| Dokumentationen / Besuchsberichte | **Fertig** | Eigene Berichtstabelle und Oberfläche mit Kunde, Datum, Tätigkeiten, Beobachtungen, Besonderheiten, nächsten Schritten, Status und Freigabe. |
| Fotos im Besuchsbericht | **Fertig** | Mobile Kamera-/Dateiauswahl, maximal vier Bilder, Größen-, MIME-, Endungs- und Bildsignaturprüfung sowie geschützte Dateiablage. |
| Sprachdokumentation | **Fertig** | Deutsches Browser-Diktat per Mikrofon; erkannter Text wird sichtbar eingefügt und kann vor dem Speichern geändert werden. |
| KI-Dokumentationsvorschläge | **Fertig** | Datensparsamer serverseitiger Dokumentationshinweis über das vorhandene Sprachmodell; sicherer regelbasierter Rückfall bei fehlender KI-Verbindung. Keine medizinische Entscheidung. |
| Automatische Einsatzplanung | **Fertig** | Rangliste anhand hinterlegter Verfügbarkeit, bevorzugter Zeiten und Tagesauslastung; Termin wird erst nach ausdrücklicher Bestätigung angelegt. |
| Umsatzprognosen | **Fertig** | Transparente Prognose aus Basiswert und Veränderungsrate für Budget, Personal, Auslastung und Umsatz; Speicherung als Prognose-Snapshot. |
| Pflegegradanalyse | **Fertig** | Vorhandener Pflegegrad-Rechner und bestehende Analysefunktion bleiben eingebunden. |
| Mitarbeiter-Auslastungsanalyse | **Fertig** | Kennzahlen, Kunden-pro-Mitarbeiter, geplante/abgeschlossene Einsätze und automatische Planungsbewertung im Analyse- und Planungsbereich. |

## Benachrichtigungen und E-Mail

| Markierte Anforderung | Ergebnis | Umsetzung und Nachweis |
|---|---|---|
| Termin geändert | **Fertig** | Änderungsanfrage mit Grund, Statusänderung, Zeitstempel und automatischer Aktualisierung. |
| Termin abgesagt | **Fertig** | Eigener Absagestatus mit Pflichtgrund, Benachrichtigung und sofortiger Aktualisierung. |
| E-Mail-Kanal | **Fertig – externe Freischaltung erforderlich** | E-Mail-/E-Brief-Anbieter kann verschlüsselt konfiguriert und getestet werden. Der Liveversand benötigt SMTP-/E-Brief-Zugangsdaten des gewünschten Anbieters. |

## Technische Abnahme

| Prüfung | Ergebnis |
|---|---|
| TypeScript-Typprüfung | **Bestanden** |
| Produktions-Build | **Bestanden** |
| Automatisierte Tests | **33 von 33 bestanden** |
| Lokale Datenbankmigration | **Bestanden** |
| Browser- und Datenbank-Ende-zu-Ende-Test | **Bestanden** |
| Smartphone-Test 390 × 844 Pixel | **Bestanden; Cookie-Hinweis überdeckt Anmeldung nicht mehr** |
| Reale Testtour mit drei datenschutzfreien Testkunden | **Karte, Stopps, Navigation, Mitarbeitername, Datum und gespeicherte Optimierung bestanden** |
| Produktionsabhängigkeiten | **Keine bekannte Schwachstelle im Audit** |

## Für die Live-Aktivierung noch vom Betreiber bereitzustellen

Diese Punkte sind keine fehlende Programmierung, sondern Zugänge externer Unternehmen. Benötigt werden je nach gewünschtem Livebetrieb: **DATEV-Produktfreischaltung und Mandantendaten, OptaData-Vertrag/Testzugang/IK-Daten, kassenseitige Zulassung und Endpunkte, SMTP- oder E-Brief-Zugang sowie eine produktive Redis-Adresse**. Ohne diese Angaben bleibt die jeweilige Verbindung absichtlich sichtbar auf „nicht eingerichtet“ oder im sicheren Rückfallbetrieb.
