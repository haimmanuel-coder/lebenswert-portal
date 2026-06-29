# Pflichtenheft – Arbeitsnotizen

## Seiten 1–5

### Projektziel und Hauptprozesse
Quelle: PflegeManagerPro.pdf, Seite 1

Geforderte digitalisierte Prozesse:
- Kundenverwaltung
- Einsatzplanung
- Tourenplanung
- Budgetkontrolle
- Leistungsnachweise
- Fahrtenbuch
- Mitarbeiterverwaltung
- Urlaubsverwaltung
- Krankmeldung
- Abrechnung
- Pflegekassenkommunikation
- Steuerbürokommunikation
- Schnittstellen zu Drittanbietern

### Technische Architektur
Quelle: PflegeManagerPro.pdf, Seiten 1–2

Frontend laut Pflichtenheft:
- React
- Next.js
- TypeScript
- Progressive Web App (PWA)
- Offline-Modus
- Mobile Optimierung
- Push-Benachrichtigungen
- Echtzeitaktualisierung

Backend laut Pflichtenheft:
- Node.js
- NestJS
- alternativ ASP.NET Core

Datenbank / Infrastruktur:
- PostgreSQL
- Redis für Caching
- AWS S3 oder Azure Blob Storage für Dateien

### Benutzerrollenmatrix
Quelle: PflegeManagerPro.pdf, Seiten 2–3

Rollen:
- Admin
- Teamleitung
- Mitarbeiter
- Buchhaltung

Wesentliche Rechte laut Matrix:
- Kunden anlegen: Admin, Teamleitung
- Kunden bearbeiten: Admin, Teamleitung, Mitarbeiter nur eigene
- Kunden löschen: nur Admin
- Touren planen: Admin, Teamleitung
- Eigene Touren sehen: Admin, Teamleitung, Mitarbeiter
- Andere Touren sehen: Admin, Teamleitung
- Leistungsnachweise prüfen: Admin, Teamleitung
- Leistungsnachweise erstellen: Admin, Teamleitung, Mitarbeiter
- Budget bearbeiten: Admin, Teamleitung
- Abrechnung exportieren: Admin, Buchhaltung
- Benutzer verwalten: nur Admin
- API-Verwaltung: nur Admin

### Datenstruktur (sichtbar auf Seiten 3–5)
Quelle: PflegeManagerPro.pdf, Seiten 3–5

Genannte Tabellen:
- customers
- customer_budgets
- employees
- appointments
- mileage_logs
- visit_reports
- notifications

Wichtige Felder (sichtbar):
- customers: kundennummer, vorname, nachname, geburtsdatum, pflegegrad, telefon, email, adresse, status, created_at
- customer_budgets: customer_id, paragraf, monatsbudget, verbraucht, restbudget
- employees: personalnummer, vorname, nachname, email, telefon, rolle, aktiv
- appointments: customer_id, employee_id, startzeit, endzeit, dauer, paragraf, status, kosten
- mileage_logs: employee_id, customer_id, startadresse, zieladresse, kilometer, fahrzeit, sonderfahrt, kosten
- visit_reports: customer_id, employee_id, appointment_id, notizen, erstellt_am
- notifications: empfaenger, titel (weitere Felder folgen auf späteren Seiten)

### Erste Vergleichs-Hinweise gegen den aktuellen Projektstand
Nur Vorabbild, noch nicht final:
- Bereits klar vorhanden: Kundenverwaltung, Budgetkontrolle, Leistungsnachweise, Fahrtenbuch, Mitarbeiterverwaltung, Pflegekassenkommunikation teilweise, PWA/Offline, Mobile Optimierung, Push-Benachrichtigungen
- Bereits potenziell fehlend oder unklar: Tourenplanung, Urlaubsverwaltung, Krankmeldung, Abrechnung, Steuerbürokommunikation, Drittanbieter-Schnittstellen, Rollen Teamleitung und Buchhaltung, echte Echtzeitaktualisierung, Redis-Caching, Next.js, NestJS, PostgreSQL

Die abschließende Bewertung erfolgt nach Sichtung der restlichen PDF-Seiten und Prüfung des Projektcodes.

## Seiten 6–10

### Benachrichtigungen und Budgetberechnung
Quelle: PflegeManagerPro.pdf, Seiten 5–7

Ergänzende Tabellenfelder notifications:
- nachricht
- gelesen
- datum

Budgetlogik laut Pflichtenheft:
- Stundensatz §39: 50 €
- Stundensatz §45a / §45b: 39 €
- Anfahrtspauschale: 6 €
- Beispielrechnung mit automatischer Restbudget-Aktualisierung bei Planung

### Geschäftsregeln
Quelle: PflegeManagerPro.pdf, Seite 7

Geforderte Regeln:
- Mindestdauer je Einsatz: mindestens 1,5 Stunden
- Speichern unterhalb dieser Grenze nicht zulässig
- Budgetüberschreitung verhindert Terminanlage und Terminänderung
- Ausnahme nur per Admin-Freigabe
- Doppelbelegung automatisch prüfen für Mitarbeiterüberschneidungen und Kundenüberschneidungen

### API-Konzept
Quelle: PflegeManagerPro.pdf, Seiten 8–9

Authentifizierung gefordert:
- OAuth 2.0
- JWT Token
- Refresh Token
- 2-Faktor-Authentifizierung

REST-Endpunkte vorgesehen für:
- Kunden
- Mitarbeiter
- Termine
- Budgets
- Fahrtenbuch

### Externe Schnittstellen
Quelle: PflegeManagerPro.pdf, Seiten 9–10

Google Maps API:
- Routenberechnung
- Kilometerermittlung
- Fahrzeitermittlung
- Navigation

OptaData:
- Datenaustausch für Kunden
- Datenaustausch für Leistungen
- Datenaustausch für Abrechnungen
- über REST API oder HL7/FHIR falls verfügbar

Lexware:
- Export von Rechnungen
- Export von Mitarbeiterkosten
- Export von Kilometerkosten
- automatisierter Export

DATEV:
- Export Lohnabrechnung
- Export Kilometerabrechnung
- Export Buchhaltung
- DATEV-kompatibel

### Workflow Leistungsnachweise
Quelle: PflegeManagerPro.pdf, Seite 10

Geforderter Ablauf:
1. Mitarbeiter beendet Einsatz
2. Leistungsnachweis wird erzeugt
3. Admin prüft
4. Admin gibt frei

### Zwischenfazit für den späteren Vergleich
- Bereits wahrscheinlich vorhanden: Google-Maps-basierte Kilometerermittlung, JWT, Teile des Leistungsnachweis-Workflows
- Wahrscheinlich fehlend oder nur teilweise vorhanden: OAuth 2.0, Refresh Token, 2FA, Admin-Freigabe bei Budgetüberschreitung, automatische Doppelbelegungsprüfung, Mindestdauer-Regel 1,5h, OptaData, Lexware, DATEV, Navigation via Maps
