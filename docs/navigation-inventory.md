# Navigationsinventur

Stand: 14. August 2026

## Einheitliches Dashboard-Schema

Alle aktiven Verwaltungsübersichten folgen dem Muster **`Admin-Dashboard · Bereich`**. Damit wird klar zwischen einer Gesamtübersicht und fachlichen Teilübersichten unterschieden.

| Bereich | Sichtbare Bezeichnung | Zugang |
|---|---|---|
| Gesamtüberblick | Admin-Dashboard · Gesamtübersicht | Dashboard |
| Management | Admin-Dashboard · Management | Verwaltungs-Schnellzugriff |
| Analysen | Admin-Dashboard · Analysen | Verwaltungs-Schnellzugriff |
| Compliance | Admin-Dashboard · Compliance | Admin-Panel |
| Arbeitssicherheit | Admin-Dashboard · Arbeitssicherheit | Admin-Panel |

## Sichtbare Navigationsstruktur

| Hauptbereich | Inhalt | Bereinigung |
|---|---|---|
| Dashboard | Übersicht, Admin-Dashboard | Benachrichtigungen entfernt; sie stehen ausschließlich unter Kommunikation. |
| Planung | Einsatzplanung, Kalender, Verfügbarkeiten, Kundenzuteilung | Keine Redundanz. |
| Kunden | Kundenliste, Aufnahme, Pflegekassen, Budget, Begleitungen, Dokumentation, Leistungsnachweise | Kundenbegleitungen aus dem entfernten Controlling hierher verschoben. |
| Mitarbeiter | Akte, Zeit, Mobilität, Abwesenheiten, Profil, 2FA | Keine Redundanz. |
| Qualität | Führerschein, Unterweisungen, Arbeitssicherheit, LNW-Freigabe | Fachlich getrennte Aufgaben. |
| Kommunikation | Benachrichtigungen | Einziger sichtbarer Zugang zu Meldungen. |
| Einstellungen | Admin-Panel, Datenschutz, Integrationen, Export, Logbuch | Keine Redundanz. |

## Vollständige Seitenkennungen und Rollenpfade

| Zielgruppe | Seitenkennungen und Zugänge |
|---|---|
| Alle Mitarbeiter | `home`, `planung`, `einsaetze`, `zeit`, `lnw`, `fahrt`, `kunden`, `besuchsberichte`, `kalender`, `verfuegbarkeiten`, `urlaub`, `krank`, `benachrichtigungen`, `profil`, `zweifaktor`, `fuehrerschein`, `sicherheitsunterweisung`, `meinearbeitssicherheit`, `datenschutz`, `export` |
| Admin und Teamleitung | `admindashboard`, `management`, `analysen`, `kundenzuteilung`, `privatrechnung`, `leistungsfreigabe` |
| Nur Admin | `admin`, `mitarbeiterakte`, `neukundenaufnahme`, `pflegekassen`, `budget`, `integrationen`, `logbuch` |
| Fachliche Unterseiten und Schnellzugriffe | `kostentraeger`, `textbausteine`, `kassenanfrage`, `buchhaltung`, `vertretungen`, `rollenverwaltung`, `arbeitszentrum`, `backupstatus`, `import`, `fahrtenabrechnung` |

Schnellzugriffe führen ausschließlich zu den definierten Renderzielen `kunden`, `benachrichtigungen`, `planung`, `einsaetze`, `fahrt` und `urlaub`. Die Navigationstypen werden gegen die Renderziele geprüft; nicht gerenderte Altkennungen sind nicht mehr deklarierbar.

## Rollenregeln

Die sichtbare Navigation wird zunächst über die Rollenbedingungen aufgebaut und anschließend über die jeweilige Modulberechtigung gefiltert. Damit erscheinen Bereiche wie Administration, Budget, Integrationen und Mitarbeiterakte nur für berechtigte Rollen. Rollenabhängige Alternativen bei Datenschutz und Export sind gegenseitig ausschließend und daher nie gleichzeitig doppelt sichtbar.

## Technische Validierung

Der Navigationsvertrag prüft die vollständige Kette: Jede deklarierte Seitenkennung besitzt genau ein Renderziel, jedes sichtbare Menü und jeder statische Schnellzugriff zeigt auf ein Renderziel, und alle aktiven Admin-Dashboards führen das Präfix **`Admin-Dashboard ·`**. Rollenabhängige Alternativen für Datenschutz und Export sind nicht gleichzeitig sichtbar.

## Nicht mehr verwendete Kennungen

Die alten Kennungen `controlling`, `controllingpage`, `mobilitaetpage` und `rbacverwaltung` sind aus dem Navigationstyp entfernt und werden von keinem Menü oder Schnellzugriff verwendet. Die früher doppelt sichtbare Navigation für Benachrichtigungen existiert ausschließlich im Bereich **Kommunikation**.
