# Ende-zu-Ende-Testbericht – Pflichtenheft-Erweiterungen

**Testdatum:** 15. Juli 2026  
**Testumgebung:** lokale Portalinstanz, frische lokale MariaDB-Testdatenbank, aktuelles Gesamtschema  
**Testkonto:** ausschließlich lokaler Administrator ohne Produktivdaten

## Technische Prüfungen

| Prüfung | Ergebnis |
|---|---|
| TypeScript-Typprüfung (`pnpm check`) | Bestanden |
| Produktions-Build (`pnpm build`) | Bestanden |
| Automatisierte Tests | 33 von 33 bestanden mit temporären lokalen Web-Push-Testwerten |
| Migration `0005_pflichtenheft_module.sql` auf leerer MariaDB | Bestanden |
| Anmeldung gegen aktuelles Gesamtschema | Bestanden |
| Administrator-Rolle und Navigation | Bestanden |

## Browser- und API-Prüfung

| Bereich | Geprüftes Verhalten | Ergebnis |
|---|---|---|
| Digitales Arbeitszentrum | Navigation und Laden der sechs Register | Bestanden |
| Termine & Verfügbarkeit | Lesen der eigenen Termine, Teamübersicht und Speichern einer Verfügbarkeit | Bestanden |
| Datenbank-Schreibtest | Montag 08:00–17:00 mit lokaler Testnotiz gespeichert und sofort erneut geladen | Bestanden |
| Besuchsberichte | Formular, Kundenwahl, Entwurf-/Einreichungsaktionen und gespeicherte Berichte laden | Bestanden; in leerer Testdatenbank erwartungsgemäß keine Kunden vorhanden |
| Schnittstellen & Exporte | Verbindungscockpit, verschlüsselte Zugangsdatenfelder, DATEV- und OptaData-Exportaktionen laden | Bestanden |
| Analyse & Prognose | Kennzahlen aus der Datenbank und transparentes Prognoseformular laden | Bestanden |
| Datenschutz | Zwei-Faktor-Einrichtung, DATEV-Einwilligung, Datenschutzgrundsätze und Dokumentstatus laden | Bestanden |
| Hilfe | Schnellstart, Rollenbeschreibung und Sicherheitshinweis laden | Bestanden |

## Wichtige Abgrenzung

Die Portalmodule für DATEV, OptaData, Pflegekassen, E-Brief, Gehaltsprogramme, Maps, Redis und externe KI sind technisch vorbereitet. Ein echter Datenaustausch darf und kann erst aktiviert werden, wenn der jeweilige Anbieter-Vertrag, offizielle Zugangsdaten sowie gegebenenfalls Freischaltungen oder Zertifizierungen vorliegen. Das Portal zeigt fehlende Verbindungen deshalb ehrlich als **nicht eingerichtet** an und simuliert keinen erfolgreichen Anbieterzugang.

Die Tests wurden ausschließlich lokal durchgeführt. Es wurden weder echte Kundendaten noch Produktivzugänge verwendet oder verändert.

## Ergänzende Sicherheitstests

| Sicherheitsfunktion | Ergebnis |
|---|---|
| Zwei-Faktor-Einrichtung starten | QR-Code, manueller Schlüssel und sechsstelliger Bestätigungsschritt wurden korrekt erzeugt; vor der Codebestätigung wurde 2FA erwartungsgemäß noch nicht aktiviert |
| DATEV-Einwilligung erteilen | Entscheidung wurde mit Zeitstempel gespeichert und unmittelbar wieder angezeigt |
| Revisionsnachweis | Oberfläche bestätigte die revisionssichere Speicherung; der Vorgang bleibt im Audit-/Einwilligungsmodell nachvollziehbar |

Der beim Test erzeugte Zwei-Faktor-Schlüssel gehört ausschließlich zum lokalen Wegwerf-Testkonto und wird nicht in Dokumentation oder Produktivsystem übernommen.

## Finale Gesamtprüfung

| Prüfung | Ergebnis |
|---|---|
| Smartphone-Anmeldung bei 390 × 844 Pixeln | Bestanden; Anmeldeknopf, Cookie-Auswahl und Rechtshinweise sind vollständig erreichbar, ohne Überdeckung |
| Drei-Spalten-Kundenansicht | Desktop-Dreispaltenstruktur und automatische mobile Untereinander-Anordnung technisch geprüft |
| Tourdaten mit drei lokalen Testkunden | Bestanden; Kundenname, vollständige Adresse, Mitarbeiter und Datum werden korrekt angezeigt |
| Karten- und Stoppliste | Bestanden; drei nummerierte Stopps werden aus den echten Tourzuordnungen geladen |
| Google-Maps-Navigation | Bestanden; Startziel und Zwischenstopps werden URL-kodiert an Google Maps übergeben |
| Lokale Routenoptimierung | Bestanden; Reihenfolge wurde serverseitig verarbeitet und dauerhaft in `tourEinsaetze.reihenfolge` gespeichert |
| Besuchsbericht per Sprache und Foto | Eingaben, Mikrofonsteuerung, Dateiprüfung, geschützter Upload und Berichtzuordnung rendern und typisieren fehlerfrei |
| KI-Dokumentationshilfe | Sichere, datensparsame Serverfunktion mit regelbasiertem Notfallmodus technisch geprüft |
| Automatische Einsatzplanung | Vorschlagsrangliste, bewusste Bestätigung und Termin-Anlage technisch geprüft |
| Rollen Teamleitung und Buchhaltung | Datenmodell, Anmeldung, Mitarbeiterverwaltung, Navigation und Serverprüfung ergänzt |
| Zwei-Faktor-Anmeldung | Zweistufiger Login und selbstständige Einrichtung/Bestätigung/Abschaltung geprüft |
| Produktionsabhängigkeiten | `npm audit --omit=dev`: keine bekannte Schwachstelle |
| Finale Typprüfung | Bestanden |
| Finaler Produktions-Build | Bestanden |
| Finale automatisierte Tests | 33 von 33 bestanden |

Der Produktions-Build meldet ausschließlich Optimierungshinweise zu großen JavaScript-Paketen und zu den in der lokalen Umgebung nicht gesetzten optionalen Analysevariablen. Diese Hinweise verhindern weder Build noch Start der App. Die produktiven Abhängigkeiten sind ohne bekannte Sicherheitswarnung; verbleibende moderate Hinweise betreffen nur ein lokales Datenbank-Migrationswerkzeug und werden nicht an Portalbesucher ausgeliefert.

## Abnahmefazit

Die intern umsetzbaren roten-X- und gelben-Kreis-Anforderungen sind als echte Portalmodule, Rollen-, Sicherheits-, Berichts-, Planungs-, Analyse-, Karten- und Exportfunktionen umgesetzt. Anbieterabhängige Direktverbindungen sind technisch vorbereitet und absichtlich nicht als „verbunden“ dargestellt, solange Verträge, offizielle Schnittstellenzugänge oder Zertifizierungen fehlen. Damit bleibt die App fachlich ehrlich und verhindert, dass ein nur optisch erfolgreicher Datenaustausch vorgetäuscht wird.
