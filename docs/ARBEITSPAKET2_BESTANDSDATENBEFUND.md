# Arbeitspaket 2 – Bestandsdatenbefund

**Prüfzeitpunkt:** 09.09.2026  
**Prüfumfang:** Aktive Leistungsnachweise; nur lesende, aggregierte Auswertung.  
**Datenänderungen:** Keine.

## Ergebnis der Betragsprüfung

Die Prüfung verglich alle aktiven Leistungsnachweise mit der jetzt verbindlichen Formel:

> **Gesamtstunden × zentraler Stundensatz + einmalig 6,00 € Anfahrt**

| Kennzahl | Ergebnis |
|---|---:|
| Aktive Leistungsnachweise | 0 |
| Fälle mit dem früheren pauschalen Betrag von 30,00 € | 0 |
| Abweichende Beträge zur neuen Formel | 0 |

Damit bestehen zum Prüfzeitpunkt **keine aktiven Bestandsdatensätze**, die berichtigt oder migriert werden müssten. Die Korrektur greift ausschließlich für neue Leistungsnachweise und das zukünftige Zusammenfassen von Einsätzen. Historische, gelöschte oder archivierte Datensätze wurden nicht verändert.

## Datenschutzinventar der Mitarbeiterkennzahlen

| Endpunkt | Einfache Mitarbeitende | Schutzmechanismus |
|---|---|---|
| `planung.minijobStatus` | Nur eigene Werte | Ziel-ID wird serverseitig auf die eigene Mitarbeiter-ID festgelegt. |
| `planung.minijobUebersicht` | Kein Zugriff | Gibt ohne Führungsrolle eine leere Liste zurück. |
| `planung.uebersicht` | Nur eigene Planung/Auslastung | Mitarbeiterfilter wird serverseitig auf die eigene ID gesetzt. |
| `planung.dashboard` | Keine Sammellohnkosten | Sammellohnkosten werden nur für berechtigte Führungsrollen geladen. |
| `analysen.mitarbeiterAuslastung` | Kein Zugriff | Ausschließlich `admin` und `teamleitung`. |
| `analysen.mitarbeiterBetreuungskennzahlen` | Kein Zugriff | Ausschließlich `admin` und `teamleitung`. |
| `besuchsberichte.list` / `getByEinsatz` | Nur eigene Berichte | Fremde Bericht-ID oder Mitarbeiter-ID wird serverseitig abgewiesen. |

Die Auswertungen sind damit für Mitarbeitende auf die eigenen Angaben begrenzt. Die Listen für Team-, Lohnkosten- oder Auslastungsvergleiche bleiben ausschließlich den vorgesehenen Führungsrollen vorbehalten.
