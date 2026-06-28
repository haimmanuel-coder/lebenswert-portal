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
- [x] DB: kostentraeger-Tabelle (id, name, ikNummer, typ, strasse, plz, ort, telefon, email)
- [x] 50+ Kostenträger/Pflegekassen mit IK-Nummern importiert
- [x] Backend: kostentraeger.list, kostentraeger.search tRPC-Routen
- [x] Frontend: Kostenträger-Suchfeld in Kundenakte (Name oder IK-Nummer)
- [x] Frontend: Kostenträger-Verwaltung im Admin-Panel

### Feature 2: Pflegegrad-Rechner & Budget-Dashboard
- [x] Backend: pflegegradBudget-Route (Jahresbudgets je Pflegegrad §45b/§45a/§39)
- [x] Frontend: Budget-Dashboard-Tab in Kundenakte (Pflegegrad, Budgets, Verbrauch, Balken)
- [x] Frontend: Pflegegrad-Rechner Widget im Export-Center

### Feature 3: Mobile Leistungserfassung mit Textbausteinen
- [x] DB: textbausteine-Tabelle (id, kategorie, titel, text, paragraph)
- [x] 25 Standard-Textbausteine für §45b/§45a/§39 importiert
- [x] Backend: textbausteine.list, textbausteine.create tRPC-Routen
- [x] Frontend: Textbausteine-Seite mit Kategorie-Filter und Kopieren-Funktion
- [x] Frontend: Digitale Unterschrift direkt im Leistungserfassungs-Sheet

### Feature 4: Automatische Fahrtkosten-Berechnung
- [x] Backend: fahrtkosten.berechne-Route (Google Maps Distance Matrix)
- [x] Frontend: Auto-Berechnung km im Fahrtenbuch via Google Maps Button
- [x] Frontend: Vergütungsvorschau automatisch aktualisieren

### Feature 5: E-Brief-Modul (Dokumentenversand)
- [x] Frontend: E-Brief-Seite im Export-Center (Empfänger, Betreff, Inhalt, Versand-Button)
- [x] Backend: eBrief.send-Route (speichert Versand-Log, zeigt Bestätigung)
- [x] Frontend: Versand-Log mit Status-Badges

### Feature 6: Massen-Download-Tool (ZIP-Export)
- [x] Backend: export.massDownload-Route (CSV-Export Leistungsnachweise + Fahrtenbuch)
- [x] Frontend: Export-Center im Admin-Menü (Filter: Monat, Typ)
- [x] Frontend: CSV-Download-Button mit Toast-Benachrichtigung

## Phase 9 – Merge-Konflikt-Fixes
- [x] routers.ts: fehlende Imports ergänzt (getKostentraegerById, deleteTextbaustein, getEbriefLog, getEbriefLogByKunde)
- [x] routers.ts: createEbriefLog → createEBriefLog korrigiert
- [x] routers.ts: getAllTextbausteine in db.ts um optionale Parameter (paragraph, kategorie) erweitert
- [x] routers.ts: textbausteineCreate Kategorie-Enum korrigiert (bericht|gesundheit|aktivitaet|bemerkung|sonstiges)
- [x] routers.ts: textbausteineCreate text-Feld → inhalt-Feld korrigiert
- [x] routers.ts: textbausteineUpdate text-Feld → inhalt-Feld korrigiert
- [x] routers.ts: status "gesendet" → "versendet" korrigiert
- [x] Textbausteine.tsx: alle text-Felder auf inhalt umgestellt
- [x] PortalApp.tsx: navTo("budget") → navTo("kunden") korrigiert
- [x] PortalApp.tsx: navTo("ebrief") → navTo("export") korrigiert
- [x] 0 TypeScript-Fehler (npx tsc --noEmit)
- [x] 29 Tests bestanden (pnpm test)

## Phase 10 – Push-Benachrichtigungen, PDF-Export, Offline-Modus

### Feature 1: Push-Benachrichtigungen für Budget-Warnungen
- [x] Backend: Web Push VAPID-Keys generieren und speichern
- [x] Backend: pushSubscriptions-Tabelle in DB anlegen
- [x] Backend: tRPC-Route push.subscribe (Subscription speichern)
- [x] Backend: tRPC-Route push.sendBudgetWarnung (Admin-only, sendet Push an alle)
- [x] Backend: Automatischer Push beim Einsatz-Abschluss wenn Budget < 10%
- [x] Frontend: Push-Berechtigung anfordern (Notification API)
- [x] Frontend: Service Worker für Push-Empfang registrieren (push-sw.js)
- [x] Frontend: Push-Opt-In-Karte im Dashboard

### Feature 2: PDF-Export mit Unterschrift und Stempel
- [x] Frontend: pdfGenerator.ts mit jsPDF (kein Backend nötig)
- [x] Frontend: PDF-Download-Button in jedem Leistungsnachweis
- [x] PDF enthält: Kunden-Stammdaten, Paragraph, Stunden, Datum, Unterschrift-Bild, Lebenswert-Stempel

### Feature 3: Offline-Modus mit Service Worker (PWA)
- [x] Service Worker: sw.js mit Cache-First für Assets, Network-First für API
- [x] Service Worker: IndexedDB Queue für Offline-Einsätze
- [x] Service Worker: Background Sync beim nächsten Online-Gang
- [x] Frontend: Offline-Indikator (gelbes Badge) in TopBar
- [x] Frontend: useOfflineSync-Hook für Online/Offline-Erkennung
- [x] Offline-Fallback-Seite (offline.html)
- [x] SW-Registrierung in index.html

## Phase 11 – VAPID-Secrets & Kunden-Unterschrift

### Feature 1: VAPID-Keys als Umgebungsvariablen
- [x] VAPID_PUBLIC_KEY und VAPID_PRIVATE_KEY als Secrets hinterlegen
- [x] Hartcodierte Keys aus server/webpush.ts entfernen (ENV.vapidPublicKey/vapidPrivateKey)
- [x] Fehler-Handling wenn Keys fehlen (graceful disable)
- [x] 4 neue Vitest-Tests für VAPID-Key-Validierung

### Feature 2: Kunden-Unterschrift beim Einsatz-Abschluss
- [x] Zweites SignatureCanvas (grüner Rahmen) im Einsatz-Abschluss-Sheet
- [x] unterschriftKunde-Wert an updateStatus-Mutation übergeben
- [x] Kunden-Unterschrift auch im Leistungsnachweis-Einreich-Sheet
- [x] pdfGenerator.ts: Kunden-Unterschrift bereits im PDF-Layout integriert
