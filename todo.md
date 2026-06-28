# Lebenswert Betreuung – Mitarbeiter-Portal TODO

## Datenbank & Backend
- [x] Datenbankschema: mitarbeiter, kunden, einsaetze, leistungen, fahrten
- [x] Drizzle-Migration generieren und ausführen
- [x] tRPC Router: auth (login/logout/me)
- [x] tRPC Router: kunden (list)
- [x] tRPC Router: einsaetze (list, create, updateStatus)
- [x] tRPC Router: leistungen (list, create)
- [x] tRPC Router: fahrten (list, create)
- [x] Custom JWT-Login (E-Mail + Passwort, kein OAuth)

## Frontend – Layout & Navigation
- [x] Grünes Farbschema (#4a8c3f) in index.css
- [x] Mobile-first Layout mit Bottom-Navigation (5 Tabs)
- [x] Top-Bar mit Avatar, Name und Logout-Button
- [x] FAB (Floating Action Button) für Schnellerfassung
- [x] Toast-Benachrichtigungen

## Frontend – Seiten
- [x] Login-Seite (E-Mail/Passwort, Fehleranzeige, SSL-Hinweis)
- [x] Dashboard (Begrüßung, Timer, KPI-Karten, Heute-Liste, Nächste Einsätze)
- [x] Einsätze-Seite (Filter, Liste, Abschluss-Sheet)
- [x] Zeiterfassung (Timer, manuelle Erfassung, Tagesübersicht)
- [x] Leistungsnachweise (Liste, Einreich-Sheet, Betragsvorschau)
- [x] Fahrtenbuch (Monatsübersicht, Liste, Erfassungs-Sheet)

## Features & Komponenten
- [x] Live-Timer (Start/Pause/Stop, sync zwischen Dashboard & Zeiterfassung)
- [x] Unterschriften-Canvas (für Einsatzabschluss und Leistungsnachweis)
- [x] Abschluss-Sheet (Bericht, Gesundheit, Bemerkung, Unterschrift)
- [x] Fahrt-Sheet (Datum, Typ, Von/Nach, km, Kunde, Zweck, Vergütungsvorschau)
- [x] Leistungsnachweis-Sheet (Monat, Kunde, §, Stunden, Anzahl, Unterschrift)
- [x] Badge-Zähler für offene Nachweise in Navigation
- [x] Kunden-Selects in allen Formularen

## Tests
- [x] Vitest-Tests für tRPC-Router (auth, portal.me, portal.logout, portal.login)

## Phase 4 – Admin-Bereich & Management (Todo-Liste)
- [x] Branding: "Lebensnah" → "Lebenswert" in allen Dateien
- [x] Admin-Panel: Mitarbeiterverwaltung (Anlegen, Bearbeiten, Aktivieren/Deaktivieren)
- [x] Admin-Panel: Kundenverwaltung (Anlegen, Bearbeiten mit Pflegegrad & Paragraph)
- [x] Admin-Panel: Kunden-Zuordnung zu Mitarbeitern
- [x] Admin-Panel: Monatsabschluss mit CSV-Export
- [x] Management-Dashboard: 6 KPI-Karten (Mitarbeiter, Kunden, Einsätze, Stunden, km, Vergütung)
- [x] Management-Dashboard: Balkendiagramm Einsätze letzte 6 Monate (Recharts)
- [x] Management-Dashboard: Liniendiagramm Stunden letzte 6 Monate (Recharts)
- [x] Management-Dashboard: Kreisdiagramme §-Verteilung und Einsatz-Status (Recharts)
- [x] Management-Dashboard: Audit-Log mit Filter (25/50/100/200 Einträge)
- [x] Kunden-Detailseite mit allen Einsätzen, Leistungsnachweisen und Fahrten
- [x] Admin-Menü im TopBar (nur für Admin-Rolle sichtbar, ⚙️-Icon)
- [x] PWA-Manifest (manifest.json) mit grünem Theme
- [x] Apple-Touch-Icon Meta-Tags und Inter-Font
- [x] 21 Vitest-Tests bestanden (0 Fehler)
- [x] TypeScript: 0 Fehler

## Phase 5 – Kundenliste aus PDF
- [x] Kundendatenbank: Felder für Versicherungsnummer, Kostenträger, Geburtsdatum, Telefon, Mobil erweitern
- [x] Kundendatenbank: Budget-Felder §45b, §45a, §39 mit letzter Abrechnung ergänzen
- [x] Alle 70 Kunden aus PDF-Kundenliste in Datenbank importiert
- [x] Budget-Daten (§45b, §45a, §39) aus PDF-Budgetliste importiert
- [x] Kunden-Seite in WebApp mit vollständigen Stammdaten und aktuellem Budget anzeigen
- [x] Budget-Übersicht: Verbrauchtes vs. verfügbares Budget je Paragraph mit Balken-Anzeige

## Phase 6 – Budget-Features
- [x] Backend: tRPC-Route kunden.updateBudget (Admin-only)
- [x] Backend: tRPC-Route kunden.budgetWarnungen (Kunden mit < 10% Restbudget)
- [x] Backend: Einsatz-Abschluss aktualisiert Budget automatisch (verbraucht45b/45a/39)
- [x] Admin-Panel: Budget-Bearbeitungs-Sheet je Kunde (§45b, §45a, §39 editierbar)
- [x] Kundenliste: Roter Badge bei < 10% Restbudget
- [x] Dashboard: Budget-Warnungs-Karte mit Anzahl kritischer Kunden
- [x] Tests für alle neuen Routen (21 Tests bestanden)

## Phase 7 – Mitarbeiter-Erweiterung
- [x] Mitarbeiter-Tabelle: Felder für Beschäftigungsart, Position, Eintrittsdatum, Telefon, Adresse
- [x] Mitarbeiter-Tabelle: Felder für Zertifikats-Status (erhalten/angemeldet/nicht angemeldet)
- [x] Mitarbeiter-Tabelle: Felder für Arbeitsvertrag (Datei-URL, Datum)
- [x] Alle 9 Mitarbeiter aus Bild importieren
- [x] Backend: Zertifikat-Update-Route (Admin)
- [x] Backend: Beschäftigungsart-Update-Route (Admin)
- [x] Backend: Arbeitsvertrag-Upload-Route (S3)
- [x] Frontend: Mitarbeiter-Detailseite mit Tabs (Stammdaten, Zertifikate, Vertrag)
- [x] Frontend: Zertifikats-Status-Badge in Mitarbeiterliste
- [x] Frontend: Beschäftigungsart-Badge (Minijob/Teilzeit/Vollzeit)

## Phase 8 – Anduril.Care Integration (6 Features)

### Feature 1: Kostenträger-System mit IK-Nummern
- [ ] DB: kostentraeger-Tabelle (id, name, ikNummer, typ, strasse, plz, ort, telefon, email)
- [ ] 50+ Kostenträger/Pflegekassen mit IK-Nummern importieren
- [ ] Backend: kostentraeger.list, kostentraeger.search tRPC-Routen
- [ ] Frontend: Kostenträger-Suchfeld in Kundenakte (Name oder IK-Nummer)
- [ ] Frontend: Kostenträger-Verwaltung im Admin-Panel

### Feature 2: Pflegegrad-Rechner & Budget-Dashboard
- [ ] Backend: pflegegradBudget-Route (Jahresbudgets je Pflegegrad §45b/§45a/§39)
- [ ] Frontend: Budget-Dashboard-Tab in Kundenakte (Pflegegrad, Budgets, Verbrauch, Balken)
- [ ] Frontend: Pflegegrad-Rechner Widget (Punkterechner → Pflegegrad-Empfehlung)

### Feature 3: Mobile Leistungserfassung mit Textbausteinen
- [ ] DB: textbausteine-Tabelle (id, kategorie, titel, text, paragraph)
- [ ] 20+ Standard-Textbausteine für §45b/§45a/§39 importieren
- [ ] Backend: textbausteine.list, textbausteine.create tRPC-Routen
- [ ] Frontend: Leistungserfassungs-Sheet mit Textbaustein-Auswahl
- [ ] Frontend: Digitale Unterschrift direkt im Leistungserfassungs-Sheet

### Feature 4: Automatische Fahrtkosten-Berechnung
- [ ] Backend: fahrtkosten.berechne-Route (Mitarbeiter-Adresse + Kunden-Adresse → km-Schätzung)
- [ ] Frontend: Auto-Berechnung km beim Auswählen von Mitarbeiter + Kunde im Fahrtenbuch
- [ ] Frontend: Vergütungsvorschau automatisch aktualisieren

### Feature 5: E-Brief-Modul (Dokumentenversand)
- [ ] Frontend: E-Brief-Seite im Admin-Bereich (Empfänger, Betreff, Anhang, Versand-Button)
- [ ] Backend: eBrief.send-Route (speichert Versand-Log, zeigt Bestätigung)
- [ ] Frontend: Versand-Log mit Status-Badges

### Feature 6: Massen-Download-Tool (ZIP-Export)
- [ ] Backend: export.massDownload-Route (sammelt Leistungsnachweise, Verträge, Zertifikate)
- [ ] Frontend: Export-Center im Admin-Panel (Filter: Monat, Mitarbeiter, Typ)
- [ ] Frontend: ZIP-Download-Button mit Fortschrittsanzeige
