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
- [x] PDF: Neue Vorlage mit Optadata-Abtretungshinweis, Einsatz-Tabelle (Datum/Uhrzeit/Dauer/Pauschale/km), Pflegegrad+seit-Feld, zwei Unterschriftszeilen (MA+Stempel, Kunde), IK-Nr. 460 547 168 in Header/Footer
- [x] Leistungsnachweise.tsx: kundePflegegradSeit + einsaetze[] an PDF-Generator übergeben

## Admin-Interface Sicherheitsunterweisungen
- [x] SicherheitsunterweisungenAdminTab.tsx: Vollständige Verwaltungsoberfläche
- [x] KPI-Karten: Aktive Unterweisungen, Pflicht-Unterweisungen, Offene Bestätigungen
- [x] Unterweisungs-Karten mit Fortschrittsbalken (X/Y Mitarbeiter bestätigt)
- [x] Detail-Ansicht: Wer hat bestätigt (grün) / wer noch nicht (rot) mit Timestamp
- [x] Neue Unterweisung anlegen (Titel, Inhalt, Kategorie, Pflicht, Version, Gültig-bis)
- [x] Bestehende Unterweisung bearbeiten inkl. Versions-Hinweis
- [x] Unterweisung deaktivieren mit Bestätigungsdialog
- [x] AdminPanel: neuer Tab '🦺 Sicherheitsunterweisungen' eingebunden

## Beschäftigungsverhältnis-Auswahl beim Mitarbeiter
- [x] Backend: mitarbeiterCreate + mitarbeiterUpdate um beschaeftigungsart (minijob/teilzeit/vollzeit) erweitert
- [x] Frontend: Dropdown '🟣 Minijob / 🔵 Teilzeit / 🟢 Vollzeit' im MA-BottomSheet
- [x] openEditMa liest beschaeftigungsart aus DB und befüllt Dropdown
- [x] resetMaForm setzt Dropdown zurück auf 'minijob'

## Drei weitere Features (02.08.2026)
- [x] Feature 1: Beschäftigungsverhältnis in Mitarbeiterakte (MitarbeiterDetail.tsx) bereits vollständig angezeigt + editierbar (3-Button-Toggle: Minijob/Teilzeit/Vollzeit)
- [x] Feature 2: pflegegradSeit-Datumsfeld im Kunden-Formular (AdminPanel) editierbar + Router-Procedure erweitert
- [x] Feature 3: Führerschein-Check-Modul (FuehrerscheinCheckTab.tsx)
  - [x] Neue DB-Tabelle fuehrerschein_checks (camelCase-Spalten)
  - [x] DB-Helpers: getFuehrerscheinChecksNeu, createFuehrerscheinCheckNeu
  - [x] Router-Procedures: listMitStatus, alleChecks, adminCreate, uploadFoto
  - [x] KPI-Karten: Gültig, Überfällig, Kein Check
  - [x] Mitarbeiter-Liste mit Ampel-System (grün/gelb/rot)
  - [x] Check erfassen: Status, Datum, Auto-+6-Monate, Foto-Upload (Kamera), Bemerkung
  - [x] Verlauf-Ansicht pro Mitarbeiter
  - [x] AdminPanel: neuer Tab '🪖 Führerschein-Checks' eingebunden

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

## Phase 12 – Führerschein, Neukundenaufnahme, Kalender

### Feature 1: Führerschein-Kontrollmodul
- [x] DB: fuehrerschein_checks-Tabelle (mitarbeiter_id, foto_key, foto_url, pruef_datum, naechstes_pruef_datum, status)
- [x] Backend: tRPC fuehrerschein.list, fuehrerschein.listAll, fuehrerschein.create, fuehrerschein.updateStatus
- [x] Frontend: Seite Fuehrerschein.tsx mit Kamera-Upload, Archiv, Fälligkeitsanzeige, Gesetzeshinweis
- [x] Navigation: Menüpunkt "Führerschein-Kontrolle" im Admin-Menü (orange)

### Feature 2: Neukundenaufnahme-Modul
- [x] DB: neukundenaufnahmen-Tabelle (alle Stammdaten, Pflegegrad, Kostenträger, Vollmacht-Unterschriften)
- [x] Backend: tRPC neukundenaufnahme.create, neukundenaufnahme.list, neukundenaufnahme.updateStatus
- [x] Frontend: Seite NeukundenAufnahme.tsx mit 4-stufigem Formular (Stammdaten → Adresse → Kostenträger → Unterschriften)
- [x] PDF: Vollmacht-Generierung mit jsPDF (Stammdaten + Dauervollmacht-Text + Unterschriften)
- [x] Navigation: Menüpunkt "Neukundenaufnahme" im Admin-Menü (lila)

### Feature 3: Einsatz-Kalenderansicht
- [x] Frontend: Seite Kalender.tsx mit Monatskalender (CSS Grid, 7 Spalten)
- [x] Farbcodierung: geplant=grau, abgeschlossen=grün, verpasst=rot, unterwegs=blau
- [x] Monats-Statistik (Gesamt, Erledigt, Geplant, Verpasst)
- [x] Tages-Detail-Karte beim Klick auf einen Tag
- [x] Navigation: Menüpunkt "Einsatz-Kalender" im Admin-Menü (blau)

## Phase 13 – Kundendaten CRUD & Onboarding-Tour

### Kundendaten CRUD (Frontend-Lücken)
- [x] Kundenliste.tsx komplett neu: Anlegen-Sheet (4 Abschnitte: Stammdaten, Adresse, Kontakt, Pflege/Kostentraeger)
- [x] Bearbeiten-Sheet mit Budget-Feldern (§45b, §45a, §39)
- [x] Deaktivieren-Button (Admin-only, Bestätigungsdialog)
- [x] KPI-Karten (Gesamt, Budget §45b, Budget §39, Kritisch)
- [x] Suche, Filter (PG, Paragraph) und Sortierung (A-Z, PG, Budget)
- [x] Loading/Error-States mit Retry-Button

### Onboarding-Tour
- [x] OnboardingTour.tsx mit 8 Schritten (Willkommen, Navigation, Einsatz, Leistungsnachweis, Unterschrift, Fahrt, Offline, Hilfe)
- [x] Fortschrittsbalken, Schritt-Punkte, Zurueck/Weiter-Navigation
- [x] Tipp-Box (gelb) und Aktion-Box (gruen) pro Schritt
- [x] Automatischer Start beim ersten Login (localStorage-Flag)
- [x] '?'-Hilfe-Button in TopBar zum manuellen Neustart
- [x] useOnboardingTour-Hook fuer programmatischen Zugriff
- [x] Integration in PortalApp.tsx

## Phase 14 – Kassenanfrage-Modul (Vollmacht Budget-Abfrage bei Kassen)

### Datenbank & Backend
- [x] DB: kassenanfragen-Tabelle (mitarbeiterId, kundenId, kostentraegerId, anfrageTyp, vollmachtText, unterschriftKunde, unterschriftMitarbeiter, status, antwort, createdAt)
- [x] Backend: tRPC kassenanfrage.create, kassenanfrage.list, kassenanfrage.getByKunde, kassenanfrage.updateStatus

### Frontend
- [x] KassenAnfrage.tsx: Vollmacht-Formular (Kunde wählen, Kasse wählen, Anfragetyp, Vollmacht-Text)
- [x] Unterschriftenfelder: Mitarbeiter + Kunde mit Vorschau und Zurücksetzen
- [x] PDF-Generator: Vollmacht-PDF mit Briefkopf, Vollmacht-Text, Kunden-/Mitarbeiter-Unterschrift
- [x] Archiv-Ansicht: alle gestellten Anfragen mit Status (offen/beantwortet/abgelehnt)
- [x] Navigation: Menüpunkt in PortalApp.tsx

## Phase 14 – Abgeschlossen ✅
- [x] DB: kassenanfragen-Tabelle angelegt
- [x] Backend: tRPC kassenanfrage.create, kassenanfrage.list, kassenanfrage.getByKunde, kassenanfrage.updateStatus
- [x] Frontend: Kassenanfrage.tsx mit Vollmacht-Formular, Unterschriften, PDF-Export, Archiv
- [x] Navigation: Menüpunkt "Kassenanfragen" im Admin-Menü (teal)
- [x] 0 TypeScript-Fehler, 33/33 Tests bestanden

## Phase 15 – Pflichtenheft-Lücken schließen

### Datenbank
- [x] DB: urlaubsantraege-Tabelle (mitarbeiterId, von, bis, tage, status, notizen, createdAt)
- [x] DB: krankmeldungen-Tabelle (mitarbeiterId, von, bis, tage, notizen, createdAt)
- [x] DB: touren-Tabelle (mitarbeiterId, datum, status, notizen)
- [x] DB: tour_einsaetze-Tabelle (tourId, einsatzId, reihenfolge)
- [x] DB: notifications-Tabelle (empfaengerId, titel, nachricht, gelesen, createdAt)
- [x] DB: refreshTokens-Tabelle (mitarbeiterId, token, expiresAt)

### Backend – Geschäftsregeln
- [x] Backend: Mindestdauer 1,5h Validierung in einsaetze.create und einsaetze.updateStatus
- [x] Backend: Doppelbelegungsprüfung (Mitarbeiter + Kunde) in einsaetze.create
- [x] Backend: Budget-Sperre bei Überschreitung in einsaetze.create (Ausnahme: Admin)

### Backend – Neue Module
- [x] Backend: urlaub.create, urlaub.list, urlaub.updateStatus (Admin-Genehmigung)
- [x] Backend: krank.create, krank.list (Admin kann alle sehen)
- [x] Backend: touren.create, touren.list, touren.addEinsatz, touren.removeEinsatz, touren.reorder
- [x] Backend: notifications.list, notifications.markRead, notifications.markAllRead
- [x] Backend: Leistungsnachweis-Freigabe: leistungen.updateStatus mit Admin-Prüf-UI
- [x] Backend: export.datev (DATEV-kompatibles Format)
- [x] Backend: export.lexware (Lexware-kompatibles CSV)
- [x] Backend: Refresh Token Mechanismus (refreshTokens-Tabelle, /refresh-Route)

### Frontend – Neue Seiten
- [x] Frontend: Urlaub.tsx – Urlaubsantrag stellen, Status verfolgen, Admin-Genehmigung
- [x] Frontend: Krankmeldung.tsx – Krankmeldung einreichen, Admin-Übersicht
- [x] Frontend: Tourenplanung.tsx – Wochenansicht, Drag & Drop, Einssätze zuweisen
- [x] Frontend: Profil.tsx – Eigene Stammdaten, Passwort ändern
- [x] Frontend: Benachrichtigungen.tsx – In-App-Inbox mit gelesen/ungelesen
- [x] Frontend: Leistungsnachweis-Freigabe in AdminPanel.tsx einbauen (eigene Seite LeistungsFreigabe.tsx)
- [x] Frontend: DATEV/Lexware-Export im ExportCenter.tsx ergänzen

### Navigation
- [x] Navigation: Urlaub, Krankmeldung, Tourenplanung, Profil, Benachrichtigungen in PortalApp.tsx einbinden
- [x] Navigation: Benachrichtigungs-Badge (Anzahl ungelesener) in TopBar

## Phase 20 – Export, Filter und Pflegegrad-Budget-Automatik

- [x] shared/pflegegradBudgets.ts: Pflegegrad-Tabelle (§45b=131€, §45a je Pflegegrad) als Konstante
- [x] Kundenliste.tsx: Pflegegrad-Auswahl löst automatische Budget-Vorschläge aus (manuell überschreibbar)
- [x] BudgetHistorieTab: Filter nach Monat, Paragraph, Mitarbeiter
- [x] BudgetHistorieTab: CSV-Export der gefilterten Transaktionen
- [x] BudgetHistorieTab: PDF-Export der gefilterten Transaktionen (client-seitig mit jsPDF)

## Phase 21 – Fahrtenbuch-Löschfunktion, Kalender-Tourenplanung, Personalbogen, Self-Service-Profil

- [x] Fahrtenbuch: Backend deleteFahrt-Route (db.ts + routers.ts)
- [x] Fahrtenbuch: Lösch-Button mit Sicherheitsabfrage im Frontend
- [x] Fahrtenbuch: Toast-Bestätigung nach Löschen
- [x] Tourenplanung: Kalenderansicht (Wochenkalender, Drag-and-Drop)
- [x] Tourenplanung: Tour direkt im Kalender erstellen (Klick auf Tag)
- [x] Tourenplanung: Tour bearbeiten/verschieben im Kalender
- [x] Mitarbeiterverwaltung: Personalbogen-Button (Admin-only) in Mitarbeiter-Detailansicht
- [x] Mitarbeiterverwaltung: Personalbogen-PDF mit allen Mitarbeiterdaten (jsPDF)
- [x] Profil: Eigene Stammdaten bearbeiten (Telefon, Adresse, E-Mail)
- [x] Profil: Passwort ändern (altes Passwort bestätigen, neues setzen)

## Phase 22 – Kalender-Abwesenheiten, Fahrtenbuch-Filter/Export, Dokument-Upload

- [x] Tourenkalender: Urlaubsanträge (genehmigt) als gelbe Balken im Kalender anzeigen
- [x] Tourenkalender: Krankmeldungen als rote Balken im Kalender anzeigen
- [x] Tourenkalender: Legende (Urlaub/Krank/Tour) unter dem Kalender
- [x] Tourenkalender: Tooltip bei Hover auf Abwesenheits-Balken (Name, Zeitraum)
- [x] Fahrtenbuch: Filter nach Monat, Fahrtyp und Kunde
- [x] Fahrtenbuch: CSV-Export der gefilterten Einträge (Datum, Von, Nach, km, Vergütung)
- [x] Fahrtenbuch: Monats-Zusammenfassung (Gesamt-km, Gesamt-Vergütung) im Filter-Bereich
- [x] MeinProfil: Dokument-Upload-Tab (Qualifikationsnachweise, Zertifikate, sonstige Dokumente)
- [x] MeinProfil: Dokumente in S3 speichern, Metadaten in DB (mitarbeiterDokumente-Tabelle)
- [x] MeinProfil: Hochgeladene Dokumente auflisten mit Download-Link und Lösch-Option
- [x] Personalbogen-PDF: Abschnitt "Hochgeladene Dokumente" mit Dateinamen und Datum

## Phase 23 – Prozessdiagramm-Abgleich (P1–P5)

- [x] Schema: kunden.wunschtag1 und wunschtag2 (Wochentag-Enum) hinzufügen
- [x] Schema: mitarbeiter.hatDienstwagen (boolean) + fahrzeugTyp hinzufügen
- [x] Schema: neukundenPushBestaetigung Tabelle anlegen
- [x] Schema: einsaetze.anfahrtPauschale (decimal) und unterschreitungEskaliert (boolean) hinzufügen
- [x] DB-Migration ausführen
- [x] Backend: Neukunden-Push-Workflow (Bestätigungspflicht, 24h/48h-Eskalation)
- [x] Backend: DSGVO-Vertretungs-Push (Mindestdaten, Übernahme-Bestätigung, Vollzugriff)
- [x] Backend: Anfahrtspauschale 6€ automatisch bei Einsatz-Abschluss
- [x] Backend: Dienstwagen-Flag → 0€ Erstattung für Mitarbeiter, 0,35€/km für Kunden
- [x] Backend: Mindestzeit-Eskalation (3× Unterschreitung → Admin-Alert)
- [x] Frontend: Wunschtage im Kunden-Formular (Kundenliste.tsx) – Wunschtag 1 & 2 Selects
- [x] Frontend: Dienstwagen-Flag im Mitarbeiterprofil (MitarbeiterDetail.tsx) – DienstwagenCard
- [x] Frontend: Neukunden-Push-Badge in Sidebar (PortalApp.tsx)
- [x] Frontend: DSGVO-Vertretungs-Übernahme-UI in Vertretungen.tsx (VertretungsUebernahmePanel)

## Phase 23 – Fortschritt (Checkpoint)
- [x] DB-Schema: neukundenPushBestaetigung, vertretungsUebernahmen Tabellen, dienstwagen/fahrzeugTyp, anfahrtPauschale, unterschreitungEskaliert, wunschtage
- [x] DB-Migration ausgeführt
- [x] db.ts: createNeukundenPushEintraege, getOffeneNeukundenPushFuerMitarbeiter, bestaetigeNeukundenPush, getAlleOffenenNeukundenPush
- [x] db.ts: createVertretungsUebernahme, hatVertretungsVollzugriff, getAktiveVertretungenFuerMitarbeiter, getVertretungsKundenFuerUrlaub
- [x] db.ts: getUnterschreitungsZaehler
- [x] routers.ts: kunden.create ruft createNeukundenPushEintraege auf (P1)
- [x] routers.ts: neukundenPush Sub-Router (meineOffenen, bestaetigen, alleOffen)
- [x] routers.ts: urlaub.updateStatus – DSGVO-Mindestdaten-Push bei Genehmigung (P2)
- [x] routers.ts: vertretungUebernahme Sub-Router (uebernahme, meineAktiven, pruefeZugriff)
- [x] routers.ts: einsaetze.create – Anfahrtspauschale 6€ + Mindestzeit-Eskalation (P3)
- [x] routers.ts: fahrten.create – Dienstwagen-Prüfung (0€ Erstattung bei 1%-Regelung) (P3)
- [x] routers.ts: dienstwagen Sub-Router (setzen)
- [x] Frontend: PortalApp.tsx – Neukunden-Push-Badge auf Neukundenaufnahme-Menüpunkt (P1)
- [x] Frontend: Einsaetze.tsx – Anfahrtspauschale + Mindestzeit-Warnung in Einsatz-Karte (P3)
- [x] Frontend: MitarbeiterDetail.tsx – DienstwagenCard mit Toggle + Fahrzeugtyp (P3)
- [x] Frontend: Tourenplanung.tsx – Abwesenheits-Konflikt-Warnung beim Tour-Erstellen (P4)
- [x] TypeScript: 0 Fehler
- [x] Tests: 33/33 bestanden

## Phase 24 – Restarbeiten aus PDF und Anforderungsbeschreibung
- [x] Personalbogen-Button in MitarbeiterDetail.tsx strikt nur für Admin sichtbar machen (useAuth + isAdmin-Guard)
- [x] Personalbogen-Export clientseitig gegen Nicht-Admin abgesichert (Button ausgeblendet)
- [x] Prozessabgleich P1: 24h-Erinnerung und 48h-Admin-Alert – neukundenPush.eskaliereStale Mutation
- [x] Prozessabgleich P1: Anamnesebogen bereits in NeukundenAufnahme.tsx vorhanden
- [x] Prozessabgleich P2: Vertretungs-Übernahme mit Audit-Log (createAuditLog) ergänzt
- [x] Prozessabgleich P2: automatische Bereinigung – vertretungUebernahme.bereinigen Mutation
- [x] Prozessabgleich P2: Admin-Abschluss-Nachricht nach Ende der Vertretung implementiert
- [x] Prozessabgleich P3: Mindestzeit-Warnung im Abschluss-Modal anzeigen (gelbe Box)
- [x] Prozessabgleich P4: Mindestbetreuungszeit-Hinweis beim Planen einer Tour ergänzt
- [x] Vollständigen PDF-Abgleich P1–P5 dokumentiert und alle Punkte abgehakt


## Phase 25 – Heartbeat, Kundenzuteilung & Tourenplanung-Dashboard

### 1. Heartbeat-Jobs (Backend)
- [x] SDK-Patch: server/_core/sdk.ts – CRON_OPEN_ID_PREFIX + AuthenticatedUser + buildCronUser + cron short-circuit
- [x] SDK-Patch: server/_core/types/manusTypes.ts – taskUid Feld hinzufügen
- [x] Handler: /api/scheduled/neukunden-eskalation (POST) in server/_core/index.ts registriert
- [x] Handler: /api/scheduled/vertretung-bereinigung (POST) in server/_core/index.ts registriert
- [x] Heartbeat-Job per CLI: nightly-neukunden-eskalation (täglich 02:00 UTC)
- [x] Heartbeat-Job per CLI: nightly-vertretung-bereinigung (täglich 02:05 UTC)

### 2. Admin-Kundenzuteilung (DB + Backend + Frontend)
- [x] DB-Schema: kundenZuordnung-Tabelle (mitarbeiterId, kundenId) bereits vorhanden
- [x] DB-Migration bereits ausgeführt
- [x] Backend: admin.setZuordnung Mutation (Admin only)
- [x] Backend: admin.getZuordnung Query + touren.listZugewieseneKunden
- [x] Frontend: Admin-Seite Kundenzuteilung.tsx mit Checkbox-Tabelle und sofortigem Speichern
- [x] Frontend: Kundenzuteilung in Navigation eingebunden

### 3. Tourenplanung-Dashboard (Frontend)
- [x] 2-Wochen-Kalenderansicht (Montag–Sonntag, 14 Tage in 2×7-Grid)
- [x] Kunden-Sidebar: nur dem ausgewählten Mitarbeiter zugewiesene Kunden
- [x] Drag-and-Drop: Kunde aus Sidebar auf Kalender-Tag ziehen → Tour/Besuch erstellen
- [x] Performance: Kundendaten per tRPC-Query im Hintergrund geladen
- [x] Responsive: Desktop-optimiert, Sidebar + Kalender nebeneinander ohne horizontales Scrollen

## Phase 25 – Heartbeat, Kundenzuteilung, 2-Wochen-Kalender (ERLEDIGT ✅)
- [x] Heartbeat-Handler in server/scheduledHandlers.ts erstellen (Neukunden-Eskalation + Vertretungs-Bereinigung)
- [x] Heartbeat-Handler in server/_core/index.ts registrieren
- [x] Heartbeat-Jobs per CLI registrieren (täglich 02:00 UTC Neukunden-Eskalation, 02:05 UTC Vertretungs-Bereinigung)
- [x] Admin-Kundenzuteilungs-Seite (Kundenzuteilung.tsx) implementiert
- [x] Kundenzuteilung in PortalApp.tsx Route und Navigation eingebunden
- [x] Tourenplanung: 2-Wochen-Kalender-Ansicht (14 Tage in 2×7-Grid)
- [x] Tourenplanung: Kunden-Sidebar mit zugewiesenen Kunden (links)
- [x] Tourenplanung: Drag-and-Drop Kunde aus Sidebar auf Kalender-Tag → Tour erstellen
- [x] Backend: touren.listZugewieseneKunden Procedure
- [x] Backend: touren.createFromKunde Mutation für Drag-and-Drop

## Phase 26 – Auth-Scan, Fahrtenbuch-Löschfunktion, Tourenplanung-Kalender

### 1. Auth-Hook-Scan
- [x] Alle Seiten mit useAuth (Manus OAuth) statt usePortalAuth scannen (Home, Urlaub, Krank, Tourenplanung)
- [x] Falsche Imports auf usePortalAuth umstellen

### 2. Fahrtenbuch-Löschfunktion
- [x] Backend: fahrten.delete Mutation (mit Audit-Log) – bereits vorhanden
- [x] Frontend: Löschen-Button mit Sicherheitsabfrage (AlertDialog) – in Fahrtenbuch.tsx implementiert

### 3. Tourenplanung-Kalender (Drag-and-Drop)
- [x] 2-Wochen-Kalender mit 14-Tage-Grid (2×7)
- [x] Kunden-Sidebar mit zugewiesenen Kunden (Drag-Quelle) + Suchfeld
- [x] Drag-and-Drop: Kunde auf Kalender-Tag ziehen → Tour erstellen
- [x] Tour-Chips verschiebbar (Drag innerhalb Kalender)
- [x] Abwesenheits-Konflikt-Warnung (Urlaub/Krank) im Create-Modal

## Phase 26 – Auth-Scan, Fahrtenbuch-Löschfunktion, Tourenplanung-Kalender

- [x] Auth-Scan: alle 4 Seiten mit falschem useAuth-Import auf usePortalAuth umgestellt (Home.tsx, Urlaubsverwaltung.tsx, Krankmeldung.tsx, Tourenplanung.tsx)
- [x] Fahrtenbuch: Löschfunktion mit AlertDialog (Sicherheitsabfrage + Protokoll-Hinweis) statt window.confirm
- [x] Tourenplanung: vollständiges Rewrite mit verbessertem 2-Wochen-Kalender-Design
- [x] Tourenplanung: Kunden-Sidebar mit Suchfeld und Pflegegrad-Badge
- [x] Tourenplanung: Tour-Chips mit farbigem linken Rand (Status-Indikator)
- [x] Tourenplanung: Datum-Kreis-Highlight für heutigen Tag
- [x] Tourenplanung: Startzeit/Endzeit-Felder mit Dauer-Berechnung im Create-Modal
- [x] Tourenplanung: Tour-Lösch-Bestätigung mit AlertDialog (Admin-only)
- [x] 0 TypeScript-Fehler, 33/33 Tests bestanden

## Phase 27 – Umsetzungskonzept vollständig implementieren

### Stufe 1 – Rollen, Berechtigungen, 2FA, Löschschutz
- [x] DB: mitarbeiter.rolle Enum um 'teamleitung' und 'buchhaltung' erweitern
- [x] DB: mitarbeiter 2FA-Felder (twoFactorEnabled, twoFactorSecret, twoFactorActivatedAt)
- [x] DB: zweiFaktorCodes Tabelle (Wiederherstellungscodes, gehasht, einmalig nutzbar)
- [x] DB: mitarbeiterBerechtigungen Tabelle (optionale Ausnahmen je Mitarbeiter)
- [x] DB: datenschutzDokumente Tabelle (versionierte Vereinbarungen)
- [x] DB: datenschutzZustimmungen Tabelle (Zustimmung je Nutzer und Version)
- [x] DB: backupProtokolle Tabelle (Sicherungsstatus ohne Sicherungsinhalt)
- [x] DB-Migration ausführen
- [x] Backend: Rollenverwaltung um teamleitung und buchhaltung erweitern
- [x] Backend: Berechtigungsmatrix serverseitig für alle Router-Procedures
- [x] Backend: TOTP-2FA einrichten (QR-Code, Verify, Disable, Wiederherstellungscodes)
- [x] Backend: Kunden-DSGVO-Archivierung (Soft-Delete Standard, Hard-Delete nur Admin+2FA+Texteingabe)
- [x] Backend: Datenschutzvereinbarung (create, getLatest, recordConsent, checkConsent)
- [x] Backend: Backup-Protokoll-Statusseite (letzter Lauf, Fehlerstatus)
- [x] Backend: Pagination für alle großen Listen (kunden, mitarbeiter, einsaetze, fahrten)
- [x] Frontend: Rollenverwaltung.tsx um teamleitung und buchhaltung erweitern
- [x] Frontend: 2FA-Einrichtungsseite (QR-Code, Code eingeben, Wiederherstellungscodes anzeigen)
- [x] Frontend: 2FA-Code-Eingabe beim Login
- [x] Frontend: DSGVO-Zustimmungsdialog beim ersten Login und bei neuer Version (DsgvoErstDialog)
- [x] Frontend: Backup-Statusseite im Admin-Bereich
- [x] Frontend: Pagination/Infinite Scroll in Kundenliste, Mitarbeiterliste, Einsätze

### Stufe 2 – Verfügbarkeit, Terminstatus, Navigation, Benachrichtigungen
- [x] DB: verfuegbarkeiten Tabelle (Wochentag, Zeitfenster, Gültigkeit, Sollstunden)
- [x] DB: einsatzAenderungen Tabelle (Änderungs-/Absagehistorie, Bestätigungsstatus)
- [x] Backend: Verfügbarkeits-CRUD (create, list, update, delete)
- [x] Backend: Einsatz-Änderungshistorie (recordChange, listChanges)
- [x] Backend: Automatische Terminbestätigung (In-App + Push bei Einsatz-Erstellung)
- [x] Backend: SMTP E-Mail-Benachrichtigungen (Konfiguration, Vorlagen, Versandprotokoll)
- [x] Frontend: Verfügbarkeits-Verwaltung im Mitarbeiterprofil (Wochentage, Zeitfenster)
- [x] Frontend: Einsatz-Änderungshistorie im Einsatz-Detail (Backend vorhanden)
- [x] Frontend: Google Maps / Apple Maps Navigations-Button in Einsatz-Karte
- [x] Frontend: Tourenoptimierung-Button (Reihenfolge nach Adresse/Zeitfenster)
- [x] Frontend: Echtzeit-Polling für Benachrichtigungen (alle 30s)

### Stufe 3 – Besuchsberichte, Fotos, Formulare, PDFs
- [x] DB: besuchsberichte Tabelle (Inhalt, Zustand, Freigabe, Formularversion, Unterschriften)
- [x] DB: besuchsberichtDateien Tabelle (Fotos und Anhänge mit Metadaten)
- [x] DB: formularVorlagen Tabelle (versionierte, konfigurierbare Formularfelder)
- [x] Backend: besuchsberichte CRUD (create, list, update, approve)
- [x] Backend: Foto-Upload für Besuchsberichte (S3)
- [x] Backend: Formularvorlagen CRUD
- [x] Backend: Serverseitige PDF-Generierung (Leistungsnachweise, Besuchsberichte, DSGVO)
- [x] Frontend: Besuchsbericht-Seite (Bericht pro Einsatz, Fotos, Kategorien, Unterschrift)
- [x] Frontend: Formularvorlagen-Verwaltung (Admin)
- [x] Frontend: Besuchsbericht-Freigabe (Teamleitung/Admin)

### Stufe 4 – Analysen, Prognosen, Exporte
- [x] DB: analyseSnapshots Tabelle (vorberechnete Monatskennzahlen und Prognosewerte)
- [x] Backend: Umsatzprognose (geplante Einsätze × Stundensätze + historische Daten)
- [x] Backend: Mitarbeiter-Auslastungsanalyse (Soll/Ist-Stunden, Kapazität, Ampel)
- [x] Backend: Kundenzuwachs-Analyse (neu, aktiv, beendet, Nettoentwicklung)
- [x] Backend: Pflegegradanalyse (Verteilung, Entwicklung, Budgetwirkung)
- [x] Backend: Wirtschaftliche Berichte (Umsatz, offene Leistungen, Fahrkosten, Personal)
- [x] Backend: Pünktlichkeitsanalyse (geplant vs. tatsächlich, Toleranz, Trend)
- [x] Frontend: Analyse-Dashboard mit allen 5 Auswertungen (Tabs)
- [x] Frontend: CSV-Export für Analyse-Dashboard

### Stufe 5 – Integrationen (vorbereitet, Zugang fehlt)
- [x] DB: integrationen Tabelle (Anbieter, Modus, Endpoint, Aktivstatus, verschlüsselte Konfiguration)
- [x] DB: integrationsLaeufe Tabelle (Übertragungsstatus, Wiederholungen, Fehlercode)
- [x] Backend: Integrationszentrum CRUD (create, list, update, testConnection)
- [x] Backend: OptaData Connector (vorbereitet, Status "Zugang fehlt")
- [x] Backend: DATEV Connector (CSV + optionaler API-Connector, Exporthistorie)
- [x] Backend: Lexware Connector (Mapping, Exporthistorie)
- [x] Backend: Direkte Kassenanbindung (DTA/API pro Kostenträger, Status, Vollmachtprüfung)
- [x] Frontend: Integrationszentrum-Seite (alle Connectoren, Status-Ampel, Verbindungstest)

### Stufe 6 – Echtzeit, Sprache, KI, Backup
- [x] Backend: SSE-Kanal für Echtzeit-Benachrichtigungen (/api/sse + useSSENotifications Hook)
- [x] Backend: Sprachassistent-Endpunkt (Whisper-Transkription für Besuchsbericht-Eingabe)
- [x] Backend: KI-Analysen (regelbasierte Basisprognose, optionales LLM für Erklärtexte)
- [x] Frontend: Spracheingabe-Button in Besuchsbericht (Mikrofon → Transkription → Vorschau)
- [x] Frontend: KI-Erklärtexte in Analyse-Dashboard

## Phase 28 – TypeScript-Fehler-Bereinigung (0 Fehler, 33/33 Tests)

- [x] pflichtenheftRouter.ts: einsaetze.zustand → einsaetze.status
- [x] pflichtenheftRouter.ts: verfuegbarkeiten.wochentag Typ-Mismatch (number → enum string)
- [x] pflichtenheftRouter.ts: besuchsberichte-Felder (status→zustand, datum→inhalt JSON, freigegebenVon→freigegebenVonId)
- [x] pflichtenheftRouter.ts: integrationen-Felder (status→modus, verschluesselteZugangsdaten→konfiguration)
- [x] pflichtenheftRouter.ts: integrationsLaeufe-Insert (gestartetVon/typ/meldung/beendetAt entfernt)
- [x] pflichtenheftRouter.ts: datenschutzDokumente-Insert (gueltigAb/typ/dateiUrl entfernt, in inhalt gemappt)
- [x] pflichtenheftRouter.ts: getOrSetCachedJson Argument-Reihenfolge korrigiert
- [x] integrationenRouter.ts: letzterTestStatus "ok" → "erfolg"
- [x] PflichtenheftCenter.tsx: wochentag useState number → enum string
- [x] PflichtenheftCenter.tsx: save.mutate zeitVon/zeitBis → vonZeit/bisZeit
- [x] PflichtenheftCenter.tsx: data.kennzahlen statt data direkt
- [x] PflichtenheftCenter.tsx: JSON.parse([] || "[]") → JSON.parse("[]")
- [x] drizzle/schema.ts: besuchsberichte.einsatzId nullable (optional)
- [x] server/db.ts: getMitarbeiterByEmail try/catch (DB-Fehler → null statt throw)
- [x] TypeScript: 0 Fehler (pnpm tsc --noEmit)
- [x] Tests: 33/33 bestanden (pnpm test)

## Phase 29 – UX-Verbesserungen
- [x] Besuchsberichte: Filter nach Status (alle/eingereicht/genehmigt/korrektur), Sortierung nach Datum (neueste/älteste zuerst), Suchfeld nach Kundenname
- [x] Ladeanimation (Skeleton) für Besuchsberichte beim Datenabruf
- [x] Ladeanimation (Skeleton) für Verfügbarkeiten beim Datenabruf

## Phase 30 – Granulares RBAC-System
- [x] DB: employment_type Spalte auf mitarbeiter-Tabelle (nullable, minijob/teilzeit/vollzeit)
- [x] DB: roles, permissions, role_permissions, employee_roles Tabellen anlegen
- [x] DB: Seed-Daten: Basis-Rollen (admin, teamleitung, buchhaltung, mitarbeiter) + 15 Berechtigungen
- [x] DB: Backfill bestehende Mitarbeiter → employee_roles (admin→admin, rest→mitarbeiter)
- [x] Drizzle-Schema: alle 4 neuen Tabellen + employment_type Spalte ergänzen
- [x] Backend: requirePermission-Middleware als tRPC-Middleware (Token-Cache)
- [x] Backend: requirePermissionFresh-Middleware für sensible Routen (Live-DB-Check)
- [x] Backend: JWT-Payload mit roles[] und permissions[] erweitern
- [x] Backend: tRPC-Routen für roles.list, permissions.list, employeeRoles.assign, employeeRoles.list
- [x] Frontend: Rollenverwaltung auf Mehrfachrollen umstellen (Checkboxen statt Dropdown)
- [x] Frontend: navPermissions-Guard für geschützte Menüpunkte

## Session: PDF, E-Mail, SSE, DSGVO-Dialog (Jul 2026)
- [x] Besuchsberichte: create und updateStatus Procedures
- [x] Besuchsberichte: PDF-Generierung (pdfkit) + E-Mail-Versand (nodemailer)
- [x] Besuchsberichte: PDF-Button und E-Mail-Dialog im Frontend
- [x] SSE-Kanal: /api/sse Endpunkt + useSSENotifications Hook
- [x] DSGVO-Erstanmeldungs-Dialog: DsgvoErstDialog.tsx (4-Schritte-Wizard)
- [x] DSGVO: getMeineZustimmungen, getAlleZustimmungen, zustimmenByTyp
- [x] DsgvoErstDialog in PortalApp.tsx eingebunden
- [x] Connector-Stubs: save/test Procedures im integrationenRouter
- [x] TypeScript: 0 Fehler | Tests: 33/33 bestanden

## Phase 31 – Einsatzplanung, Budgetstunden, Lohnkosten, Löschkonzept

### Fachliche Grundlagen
- [x] shared/planungsLogik.ts: zentrale Berechnungslogik für Frontend und Backend
- [x] Verrechnungssatz (36 €/Std.) strikt getrennt vom Stundenlohn (16 €/Std.)
- [x] Budgetstunden = Restbudget ÷ Verrechnungssatz (347 € ÷ 36 € = 9,64 Std.)
- [x] Stunden werden automatisch aus Start-/Endzeit berechnet (09:00–11:30 = 2,5 Std.)
- [x] Lohnkosten = Gesamtstunden × 16 € (2,5 Std. = 40 €)
- [x] Anfahrtspauschale 6 € immer budgetwirksam eingerechnet
- [x] Minijob-Grenze 603 €/Monat (nur für Beschäftigungsart „minijob")

### Datenbank
- [x] einsaetze: endzeit, paragraph2, stunden1/2, kosten1/2, lohnkosten, notizen, geplantVon
- [x] einsaetze: Soft-Delete (geloeschtAt, geloeschtVon, loeschgrund)
- [x] Neue Tabelle paragraphSaetze (historisierte Verrechnungssätze)
- [x] Neue Tabelle planungsWarnungen (bestätigen + löschen)
- [x] Soft-Delete für leistungen, fahrten, urlaubsantraege, krankmeldungen, touren
- [x] Fehlende Tabellen nachgetragen: kassenanfragen, neukundenaufnahmen, fuehrerschein_checks
- [x] Migration 0006_einsatzplanung.sql (additiv, idempotent, rückwärtskompatibel)
- [x] Datenmigration: endzeit/stunden1/lohnkosten/kosten1 für Bestandsdaten
- [x] Indizes für Planungsabfragen

### Backend
- [x] planungRouter: uebersicht (14 Tage / Woche / Monat)
- [x] planungRouter: pruefe + pruefeBearbeitung (Live-Validierung ohne Speichern)
- [x] planungRouter: erstelle, aktualisiere, setzeStatus, loesche
- [x] planungRouter: budgetUebersicht, minijobStatus, minijobUebersicht
- [x] planungRouter: dashboard (Sammelkennzahlen)
- [x] planungRouter: mitarbeiterListe (Teamleitung ohne Admin-Rechte)
- [x] planungRouter: warnungen.list/bestaetige/loesche/loescheBestaetigte
- [x] planungRouter: touren.tagesTour, speichereReihenfolge, loesche
- [x] planungRouter: loescheDatensatz (generisch, 10 Bereiche)
- [x] Budgetbuchung transaktionssicher inkl. Budgethistorie
- [x] Budgetrückbuchung bei Absage, Änderung und Löschung
- [x] 12 Validierungsregeln (Doppelbuchung, Urlaub, Krank, Budget, Minijob, Arbeitszeit …)
- [x] Audit-Log für alle Änderungen an Einsätzen, Budgets und Paragraphen
- [x] Soft-Delete-Filter in allen bestehenden Listenabfragen

### Frontend
- [x] AuswahlFeld.tsx: durchsuchbare Combobox (Kunden, Mitarbeiter, Kostenträger)
- [x] NavigationContext.tsx: seitenübergreifende Navigation
- [x] Einsatzplanung.tsx: 14-Tage/Wochen/Monatsansicht, farblich nach Mitarbeiter
- [x] Terminassistent mit Live-Budgetvorschau (vorher/nachher) und Minijob-Anzeige
- [x] Zweiter Abrechnungsparagraph direkt im Terminformular
- [x] MeineTour.tsx: manuelle Tourenreihenfolge per Drag-and-Drop und ▲▼
- [x] Navigation zu Google Maps / Apple Karten je Tourenpunkt
- [x] Kalender.tsx: Termine, Urlaub, Krank, Feiertage, Touren, freie Tage
- [x] Dashboard: 13 zusätzliche Kennzahlen inkl. Budgetverbrauch je Paragraph
- [x] Dashboard: Warnungsliste mit Bestätigen und Löschen
- [x] Löschfunktionen ergänzt: Kassenanfragen, Textbausteine, Benachrichtigungen

### Fehlerbehebungen
- [x] Kundenauswahl in Kassenanfragen repariert (Suche, keine leeren Einträge)
- [x] Schnellzugriffe im Ampel-Dashboard funktionsfähig gemacht
- [x] Benachrichtigungs-Badge: Feld „gelesenAt" → „gelesen"
- [x] Zeitzonensichere Datumsnormalisierung für DATE-Spalten
- [x] Gelöschte Datensätze verschwinden aus allen Listen

### Qualität
- [x] 51 neue Vitest-Tests für Planungslogik (81 Tests gesamt bestanden)
- [x] vitest.config.ts: shared/ in die Testausführung aufgenommen
- [x] TypeScript: 0 Fehler
- [x] docs/EINSATZPLANUNG.md: Datenbank, Validierungen, Rechte, Löschkonzept

## Lastenheft V2.0 – 11 Aufgaben (Aug 2026)

- [x] A1: Mehrfach-Paragraphenauswahl im Kundenprofil (§39, §45b, §37, Privat als JSON-Array)
- [x] A2: Kostenträger-Dropdown mit 16 Einträgen (AOK, Barmer, DAK, IKK, TK, KKH, Knappschaft, BKK, Debeka, LVM, Signal Iduna, HUK, Private PV, Beihilfe, Selbstzahler, Sonstige)
- [x] A3: Beihilfe-Integration (Ja/Nein Toggle, Pflegekasse-%, Beihilfe-%, Versicherung, Bemerkungen)
- [x] A4: Automatische Leistungsnachweise pro Paragraph nach Einsatzabschluss (je Paragraph ein LNW)
- [x] A5: Mitarbeiter-Einsatzplanung (Button im Dashboard, 2-Wochen-Vorausplanung, nur eigene Kunden)
- [x] A6: Dashboard modernisieren (Tourenplanung/Meine Tour/Manuelle Zeiterfassung entfernen, neue Icons)
- [x] A7: Mitarbeiter-Workflow (Mitteilungen, Hinweise, Krankmeldungen, Urlaubsanfragen, Vertretungsanfragen, Neue Kunden, Dokumente – alle anklickbar/bearbeitbar)
- [x] A8: Vertretungsmanagement (Freigabe bei Krank/Urlaub/Fortbildung, Push-Benachrichtigung, "Kunde übernehmen"-Button, Farbkennzeichnung Grün=eigener Kunde/Orange=Vertretung)
- [x] A9: Dokumentation nach Einsatz (Beginn/Ende, Leistung, Bemerkungen, Unterschrift Kunde+Mitarbeiter, Fotos optional)
- [x] A10: Leistungsnachweise pro Paragraph automatisch generieren (monatlich, je Paragraph separat)
- [x] A11: OptaData-Vorbereitung (Kostenträger, Leistungsart, vollständige Felder, eLNW-Struktur)

## Lastenheft V2.1 – Aufgaben 12–20 (Aug 2026)

- [x] A12: §45a Umwidmung – Kundenprofil-Felder, Budget-Warnungen (80/90/100%), Sperrlogik bei 100%
- [x] A13: Automatisches Fahrtenbuch – nach Einsatzabschluss automatisch befüllen, Filter, PDF/Excel-Export
- [x] A14: Sonderfahrten – Mitarbeiter markiert Einsatz, km × 0,35 €, erscheint auf Monatsrechnung
- [x] A15: Erweiterbare Rechnungspositionen – Einkauf, Begleitservice, Auslagen etc. mit Menge/Preis
- [x] A16: Automatische Privatrechnung – Monatsendeabrechnung, PDF, optionaler E-Mail-Versand
- [x] A17: DSGVO/IT-Sicherheit – Sitzungs-Timeout, RBAC-Härtung, Audit-Log vollständig
- [x] A18: Import-Assistent – Excel/CSV-Upload für Kunden, Pflegegrad, Kostenträger, Budgets
- [x] A19: Intelligenter Datenabgleich – Änderungsprotokoll mit Datum/Uhrzeit/Benutzer/Feld/Alt/Neu
- [x] A20: Plausibilitätsprüfung – Pflichtfelder, Doppelte Kunden/Einsätze, Budgetüberschreitung, Terminüberschneidung

## Lastenheft V2.2 – Intelligentes Budgetmanagement (A21–A27)

- [x] A21: Jahresbudgetverwaltung – Jahresbudget je Leistungsbereich (§45b, §39, §45a, Privat), Gültigkeitszeitraum, Verbrauch, Restbudget, automatische Monatsbudgetberechnung
- [x] A22: Budgetanzeige für Mitarbeiter – Monatsbudget, geplant, verbraucht, Rest (€/h/%); keine Jahresbudget-Sichtbarkeit
- [x] A23: KI-Planungsempfehlung – LLM-basierte unverbindliche Empfehlung zur optimalen Budgetausnutzung
- [x] A24: Budgetampel – Grün/Gelb/Rot/Grau in Kundenliste, Einsatzplanung, Dashboard, Kundenprofil
- [x] A25: Jahresprognose – Verbrauch, Durchschnitt, voraussichtlicher Jahresverbrauch, Restbudget, Unter-/Überauslastung
- [x] A26: Optimierungsvorschläge – Fahrtzeit-Kombination, gleichmäßige Verteilung, Budgetverfall-Vermeidung, kombinierbare Leistungsansprüche
- [x] A27: Controlling-Dashboard (Admin) – Kennzahlen, Filter (Zeitraum, MA, Leistungsbereich, Pflegegrad, Kostenträger), Excel+PDF-Export

## Fahrtennachweise-Abrechnung (16.–15. Zyklus)
- [x] Schema: fahrtenAbrechnungen-Tabelle (Zeitraum, Status, Freigabe, E-Mail-Log)
- [x] Backend: Abrechnungs-Router (Zeitraum berechnen, Fahrten zusammenführen, PDF, Admin-Freigabe, E-Mail)
- [x] Frontend: Fahrtennachweise-Freigabe-Seite im AdminPanel + Steuerbüro-E-Mail-Einstellung
- [x] Heartbeat: Automatischer E-Mail-Versand am 18. jeden Monats

## Bugfixes 2026-08-01
- [x] Fix: datenschutzDokumente-Tabelle per SQL-Migration erstellen (Fehler 1)
- [x] Fix: system.getMitteilungen Procedure im systemRouter implementieren (Fehler 2)

## Empfehlungen 2026-08-01

- [x] Empfehlung 1: Zentrales Migrations-Skript (ensureTables) beim Server-Start – alle Tabellen per CREATE TABLE IF NOT EXISTS absichern
- [x] Empfehlung 2: Admin-Interface für DSGVO-Dokumente im AdminPanel (Bearbeiten, Versionieren, Neu anlegen)
- [x] Empfehlung 3: Notifications-Tabelle in DB prüfen und per SQL absichern

## Nächste 3 Optionen 2026-08-01

- [x] Option 1: ensureTables auf alle 53 Schema-Tabellen erweitern
- [x] Option 2: DSGVO-Zustimmungs-Übersicht im DsgvoAdminTab (welcher MA hat zugestimmt)
- [x] Option 3: E-Mail-Benachrichtigung an alle Mitarbeiter bei neuer DSGVO-Version

## Umbau Einsatzplanung / Tourenplanung 2026-08-01

- [x] Tourenplanung aus Navigation und Routing entfernen
- [x] Meine Tour aus Navigation und Routing entfernen
- [x] touren/meinetour aus SeitenId-Typ entfernen
- [x] Tourenplanung aus AdminDashboard Schnellzugriff entfernen
- [x] "Termine planen" Button im MA-Dashboard einbauen
- [x] Einsatzplanung für MA-Bereich vollständig verfügbar (darfPlanen-Logik bereits im Backend)
- [x] Touren-Kachel im Dashboard auf Einsatzplanung umgeleitet

## Empfehlungen 2026-08-01 (Batch 3)
- [x] Badge-Farbe für MA-Einsätze auf Blau/Indigo umstellen
- [x] Einsatzplanung-Schnellansicht heutige Einsätze für normale MA
- [x] Kalender.tsx: Touren-Block und alle Touren-Referenzen entfernen

## Compliance-Features 2026-08-02

- [x] Führerschein-Check: automatischer 6-Monats-Erinnerungs-Workflow (Heartbeat-Job täglich 08:00)
- [x] ensureHeartbeatJobs: alle 5 Cron-Jobs beim Server-Start registrieren
- [x] Sicherheitsunterweisungen: Pflichtlektüre mit digitaler Bestätigung und Timestamp
- [x] Sicherheitsunterweisungen: MA-Seite mit Fortschrittsanzeige und Bestätigungs-Button
- [x] Sicherheitsunterweisungen: Badge in Navigation (offene Pflichtunterweisungen)
- [x] Budget-Automatik: LNW-Abschluss zieht Stunden automatisch vom Kundenbudget ab

## Features 2026-08-02 (Batch 4)

- [x] Leistungskosten §39/§45b/§45a: Admin-Interface im AdminPanel (VerrechnungssaetzeTab)
- [x] Kundenzuteilung: Bug behoben (useState in Render-Phase → useEffect)
- [x] Zeiterfassung-Kachel aus MA-Dashboard entfernt (bleibt im Menü)
- [x] Budget-Warnungen: nur zuständige MA sehen kritische Meldungen ihrer Kunden

## Mitarbeiterakte vollständige Überarbeitung (02.08.2026)
- [x] MitarbeiterDetail.tsx: 5-Tab-Menü (Stammdaten / Dokumente / Zertifikate / Vertrag / Rechte)
- [x] Tab Stammdaten: Beschäftigungsart-Toggle, Kontakt, Adresse, Beschäftigung, Dienstwagen, Deaktivieren-Bereich
- [x] Tab Dokumente: Alle Dokumente nach Typ gruppiert (Zertifikat/Arbeitsvertrag/Krankmeldung/Führerschein/Erste-Hilfe/Sonstiges), Ablauf-Ampel, Datei-Upload, Löschen
- [x] Tab Zertifikate: Status-Auswahl, Datum, Ablauf, Bemerkung
- [x] Tab Anstellungsverhältnis/Vertrag: Anstellungsdaten-Übersicht (4 Kacheln), Vertrag-Upload, Download
- [x] Tab Rollenrechte: Systemrolle ändern (4 Rollen), 12 Modul-Berechtigungen (Standard/Erlaubt/Gesperrt), Legende
- [x] Backend: mitarbeiterDeaktivieren (Soft-Delete mit Grund), getBerechtigungen, setBerechtigungen
- [x] AdminPanel MA-Tab: Suchfeld (Name/E-Mail), Beschäftigungsart-Filter (Alle/Minijob/Teilzeit/Vollzeit), Inaktive anzeigen/ausblenden, Neu-anlegen-Button

## Drei Compliance-Features (02.08.2026)
- [x] Feature 1: Backend compliance-Router (ablaufendeDokumente, uebersicht, erinnerungSenden, meineBerechtigungen)
- [x] Feature 1: Dokument-Ablauf-Erinnerungen – Admin-Push bei ablaufenden Dokumenten (≤30 Tage), Zeitfenster wählbar (14/30/60/90 Tage)
- [x] Feature 2: Modul-Berechtigungen im Portal durchgesetzt – gesperrte Module aus Navigation ausgeblendet
- [x] Feature 2: darfModulNutzen-Funktion in PortalApp + useBerechtigungen-Hook
- [x] Feature 3: ComplianceAmpelTab.tsx – Ampel-Übersicht aller aktiven MA (🔴/🟡/🟢)
- [x] Feature 3: KPI-Karten (Rot/Gelb/Grün), Filter, aufklappbare Probleme pro MA
- [x] Feature 3: Ablaufende-Dokumente-Liste mit Zeitfenster-Auswahl + Erinnerungs-Button
- [x] AdminPanel: neuer Tab '🚦 Compliance-Ampel' eingebunden

## LNW Unterschriften-Autovorschau + PDF-Vorschau (02.08.2026)
- [x] Feature 1: Unterschriften aus Einsätzen automatisch im LNW-Formular vorausfüllen
  - [x] useEffect: passende Einsätze (Kunde/Monat/Para) nach unterschriftMitarbeiter/Kunde durchsuchen
  - [x] Hinweis '✅ Automatisch aus Einsatz übernommen' im Formular anzeigen
  - [x] Nur vorausfüllen wenn Nutzer noch nichts manuell eingetragen hat
- [x] Feature 2: PDF-Vorschau-Modal vor dem Download
  - [x] pdfGenerator.ts: _buildPdf() refactored, previewLeistungsnachweisPdf() gibt blob-URL zurück
  - [x] handlePdfVorschau() öffnet Vollbild-Modal mit iframe
  - [x] '👁️ Vorschau'-Button in LNW-Karte (vor PDF-Download-Button)
  - [x] Modal-Header: Titel + Herunterladen-Button + Schließen-Button
  - [x] buildPdfData() als gemeinsame Hilfsfunktion für Vorschau und Download

## Mitarbeiterakte – Tab 6 Urlaub/Krank (04.08.2026)
- [x] MitarbeiterDetail: neuer Tab '📅 Urlaub/Krank' (6. Tab)
- [x] Backend: urlaubAdmin.listByMitarbeiter, create, updateStatus, delete
- [x] Backend: krankAdmin.listByMitarbeiter, create, delete
- [x] Frontend: Urlaubsanträge anlegen (Von/Bis, Tage, Status, Notizen)
- [x] Frontend: Status-Buttons Genehmigen/Ablehnen für offene Anträge
- [x] Frontend: Krankmeldungen anlegen (Von, Bis optional, Tage, AU-Attest-Toggle, Notizen)
- [x] Frontend: Löschen für Urlaub und Krankmeldungen
- [x] TypeScript: 0 Fehler

## Vier neue Features (04.08.2026)
- [x] Feature 1: Jahresurlaubskonto – DB-Feld urlaubstageJahr in mitarbeiter, Resturlaub automatisch berechnen
- [x] Feature 1: Resturlaub-Anzeige im Tab Urlaub/Krank (Konto/Verbraucht/Rest als Fortschrittsbalken)
- [x] Feature 1: Admin kann Jahresurlaubskonto manuell einstellen
- [x] Feature 2: Erste-Hilfe-Kurs-Modul – DB-Tabelle erste_hilfe_kurse
- [x] Feature 2: Router ersteHilfe: listByMitarbeiter, create, delete, alleStatus
- [x] Feature 2: Tab 7 'Erste-Hilfe' in MitarbeiterDetail.tsx (Kursformular, Foto-Upload, Ampel-Badges)
- [x] Feature 2: Compliance-Ampel: hatErsteHilfe-Status in Mitarbeiter-Zeile eingebaut
- [x] Feature 3: Budget-Sync – tRPC-Invalidierung bereits vollständig implementiert (bestätigt)
- [x] Feature 4: Urlaubsplanung – 'Kunde wünscht keine Vertretung' Toggle in Tab Urlaub/Krank
- [x] Feature 4: keineVertretung-Feld in urlaubsantraege-Tabelle + Schema
- [x] Feature 4: updateStatus-Procedure prüft keineVertretung-Flag vor Vertretungs-Push
- [x] Bugfix: longtext-ReferenceError (nur historisch in Logs, schema.ts verwendet text())
- [x] TypeScript: 0 Fehler | Tests: 86/86 bestanden

## Arbeitssicherheits-Modul (§5 ArbSchG, DGUV V2, BioStoffV, ArbMedVV, §12 ArbSchG)

### Datenbank
- [x] DB: arbeitssicherheit_gefaehrdungen (id, titel, bereich, risikobeschreibung, massnahmen, verantwortlich, risikoStufe, status, naechstePruefung, erstelltVon, createdAt)
- [x] DB: arbeitssicherheit_psa (id, mitarbeiterId, psaTyp, groesse, menge, ausgabeDatum, rueckgabeDatum, zustand, notizen, createdAt)
- [x] DB: arbeitssicherheit_vorsorge (id, mitarbeiterId, vorsorgeart, anlass, faelligkeit, durchgefuehrtAm, arzt, ergebnis, naechsteFaelligkeit, createdAt)
- [x] DB: arbeitssicherheit_alleinarbeit (id, mitarbeiterId, checkInZeit, checkOutZeit, checkInStatus, notfallKontakt, bemerkung, createdAt)
- [x] DB: arbeitssicherheit_unterweisungen (id, mitarbeiterId, thema, unterweisungsDatum, inhalt, bestaetigt, bestaetigtAm, naechsteFaelligkeit, createdAt)
- [x] SQL-Migration ausgeführt

### Backend
- [x] Router arbeitssicherheit: gefaehrdung.list, gefaehrdung.create, gefaehrdung.update, gefaehrdung.delete
- [x] Router arbeitssicherheit: psa.listAll, psa.meinePsa, psa.create, psa.rueckgabe, psa.delete
- [x] Router arbeitssicherheit: vorsorge.listAll, vorsorge.meineVorsorgen, vorsorge.create, vorsorge.abschliessen, vorsorge.delete
- [x] Router arbeitssicherheit: alleinarbeit.checkIn, alleinarbeit.checkOut, alleinarbeit.listOffen, alleinarbeit.meinStatus, alleinarbeit.meinVerlauf, alleinarbeit.notfallMelden
- [x] Router arbeitssicherheit: unterweisung.listAll, unterweisung.meineUnterweisungen, unterweisung.bestaetigen, unterweisung.adminCreate, unterweisung.delete
- [x] Router arbeitssicherheit: dashboard (KPIs: offene Gefährdungen, PSA-Ausgaben gesamt, überfällige Vorsorgen, offene Alleinarbeit, offene Unterweisungen)

### Frontend Admin
- [x] ArbeitssicherheitAdminTab.tsx: 6 Sub-Tabs (Übersicht / Gefährdungsbeurteilung / PSA / Vorsorge / Unterweisungen / Alleinarbeit-Monitor)
- [x] Gefährdungsbeurteilung: Karten mit Risiko-Ampel (🔴/🟡/🟢), Anlegen/Status-Update/Löschen, Status-Filter
- [x] PSA-Verwaltung: Tabelle aller Ausgaben, Ausgabe erfassen (Typ/Größe/Menge/Datum), Rückgabe markieren
- [x] Arbeitsmed. Vorsorge: Übersicht aller MA mit Fälligkeits-Ampel, Vorsorge erfassen, Abschluss-Dialog
- [x] Unterweisungen (Arbeitssicherheit): Übersicht mit Bestätigungs-Ampel, Neue Unterweisung anlegen, Themen-Filter
- [x] Alleinarbeit-Monitor: Live-Übersicht offener Check-ins (60s Refresh), Zeitüberschreitungs-Warnung (>4h), Notfall-Button
- [x] AdminPanel: neuer Tab '⛑️ Arbeitssicherheit' eingebunden

### Frontend Mitarbeiter
- [x] Mitarbeiter-Seite MeineArbeitssicherheit.tsx: eigene PSA, Vorsorge-Termine, offene Unterweisungen bestätigen
- [x] Alleinarbeit Check-in/Check-out mit Notfallkontakt-Eingabe
- [x] Alleinarbeit-Verlauf (letzte 30 Einträge)
- [x] Navigation: Menüpunkt '⛑️ Arbeitssicherheit' in Kunden & Compliance

### Qualität
- [x] TypeScript: 0 Fehler
- [x] Tests: 86/86 bestanden

## Unterweisungs-Unterschrift-Modul (05.08.2026)
- [x] DB: unterweisungsVorlagen (id, titel, thema, inhalt, version, pflicht, gueltigBis, aktiv, erstelltVon, createdAt)
- [x] DB: unterweisungsNachweise (id, unterweisungId, mitarbeiterId, unterschriftKey, unterschriftUrl, pdfKey, pdfUrl, ipAdresse, browserInfo, bestaetigtAm, inhaltSnapshot, titelSnapshot, versionSnapshot, createdAt)
- [x] Backend: unterweisungNachweisRouter – vorlagen.list/listAlle/create/update/delete
- [x] Backend: anMitarbeiterSenden – Vorlage an mehrere MA gleichzeitig senden
- [x] Backend: bestaetigenMitUnterschrift – Canvas-PNG → S3, PDF generieren → S3, DB-Nachweis speichern
- [x] Backend: getNachweis / adminGetNachweis – signierte S3-URL für PDF-Download
- [x] Backend: meineNachweise / adminAlleNachweise / adminNachweiseByMitarbeiter
- [x] PDF-Generierung: jsPDF, Lebenswert-Branding, Unterschrift eingebettet, IP+Browser-Metadaten, Fußzeile
- [x] Frontend Admin: UnterweisungNachweisAdminTab.tsx (Vorlagen, Senden, Nachweise)
- [x] Frontend Admin: ArbeitssicherheitAdminTab – neuer Sub-Tab "📜 Nachweise"
- [x] Frontend MA: UnterschriftDialog.tsx (Canvas-Pad, Inhalt anzeigen, rechtlicher Hinweis)
- [x] Frontend MA: MeineArbeitssicherheit.tsx – "✍️ Lesen & Unterschreiben" + "📄 Nachweis-PDF"
- [x] TypeScript: 0 Fehler | Tests: 86/86 bestanden

## Bugfix: Unterschriften in PDF/Druckversion (05.08.2026)
- [x] Audit: Alle 4 Unterschriften-Pfade vollständig analysiert
- [x] Root Cause: getEinsaetzeWithKunden() hatte explizites select({}) ohne unterschriftMitarbeiter/unterschriftKunde
- [x] Fix: unterschriftMitarbeiter + unterschriftKunde zu getEinsaetzeWithKunden() select hinzugefügt
- [x] Kassenanfrage-PDF: SELECT ka.* → alle Felder korrekt (kein Fix nötig)
- [x] Neukundenaufnahme-PDF: SELECT * → alle Felder korrekt (kein Fix nötig)
- [x] Leistungsnachweise-PDF: getAllLeistungen() db.select() → alle Felder korrekt (kein Fix nötig)
- [x] TypeScript: 0 Fehler
- [x] Checkpoint be706af6 gespeichert und live

## Drei Unterschriften-Features (05.08.2026)
- [x] Feature 1: Unterschriften-Archiv im Admin-Panel – Tab "📋 Unterschriften-Archiv" mit Filter nach Monat/Mitarbeiter, Vollständigkeits-Ampel
- [x] Feature 1: Backend: einsaetze.unterschriftenArchiv (Admin-Procedure: alle Einsätze mit Unterschrift-Status)
- [x] Feature 2: Unterschrift-Pflichtprüfung beim LNW-Einreichen – Warnung wenn MA-Unterschrift fehlt (nicht blockierend)
- [x] Feature 2: Warnung wenn Kunden-Unterschrift fehlt (nicht blockierend, aber deutlich sichtbar)
- [x] Feature 3: PDF-Vorschau-Modal direkt nach Einsatz-Abschluss (automatisch geöffnet)
- [x] Feature 3: Vorschau-Modal zeigt generierten LNW-Entwurf mit Unterschrift sofort nach Abschluss + Download-Button
- [x] TypeScript: 0 Fehler

## ZIP-Export Unterschriften-Archiv (05.08.2026)
- [x] Backend: einsaetze.unterschriftenZipDaten (Admin, Monat-Filter, vollständige Einsatz+Unterschrift-Daten)
- [x] Frontend: ZIP-Download-Button im UnterschriftenArchivTab mit Lade-Spinner und Hinweis-Banner
- [x] ZIP-Logik: JSZip + jsPDF, Dateiname DATUM_Kunde_MA_ID.pdf, DEFLATE-Kompression
- [x] TypeScript: 0 Fehler

## Datenschutz-Features Erweiterung (05.08.2026)
- [x] Backend: datenschutzRouter.listVorlagen (alle Dokumente inkl. inaktive)
- [x] Backend: datenschutzRouter.createVorlage (Admin, Titel/Inhalt/Version/Pflicht/Typ)
- [x] Backend: datenschutzRouter.deleteVorlage (soft-delete via aktiv=false)
- [x] Backend: datenschutzRouter.zustimmungsErinnerung (E-Mail an alle MA ohne Zustimmung + notifyOwner)
- [x] Backend: datenschutzRouter.csvExport (CSV mit JOIN auf mitarbeiter + dokumente)
- [x] Frontend: Vorlagen-Tab vollständig verdrahtet (listVorlagen + createVorlage + deleteVorlage + Erinnern-Button je Vorlage)
- [x] Frontend: CSV-Download-Button im "Alle Mitarbeiter"-Tab (Blob-Download)
- [x] Frontend: Erinnerungs-Button im "Alle Mitarbeiter"-Tab (erstes aktives Dokument)
- [x] Frontend: Zustimmungs-Tabelle zeigt zugestimmt/ausstehend als Zähler-Badges
- [x] Frontend: Meine Einwilligungen nutzt korrekte Feldnamen (z.titel, z.id, z.zugestimmtAt)
- [x] TypeScript: 0 Fehler

## Heartbeat + Login-Pflicht + Audit-Log (05.08.2026)
- [x] DB: datenschutz_audit_log (id, aktion, dokumentId, dokumentTitel, adminId, adminName, details, createdAt)
- [x] Backend: datenschutzRouter.getAuditLog (Admin, limit 100, 30s Refresh)
- [x] Backend: Audit-Log-Einträge bei createVorlage/deleteVorlage/zustimmungsErinnerung
- [x] Backend: Heartbeat-Job 'datenschutz-erinnerung' (jeden Montag 08:00) – MA ohne Pflicht-Zustimmung an Admin melden
- [x] Backend: Heartbeat-Job 'unterweisungen-faelligkeit' (täglich 07:00) – ≤30 Tage fällige Unterweisungen an Admin melden
- [x] Backend: datenschutzRouter.checkPflichtZustimmungen – Procedure für Login-Pflichtprüfung
- [x] Frontend: DsgvoPflichtModal.tsx – Modal bei Login wenn offene Pflicht-Dokumente vorhanden
- [x] Frontend: PortalApp.tsx – DsgvoPflichtModal nach Login einblenden
- [x] Frontend: Datenschutz.tsx – neuer Tab "🕵️ Audit-Log" (Admin, Farb-Badges je Aktion)
- [x] TypeScript: 0 Fehler

## 5 Features: Compliance + Mitarbeiterakte (05.08.2026)

### Feature 1: Unterweisungs-Wiederholungs-Intervall
- [x] DB: arbeitssicherheit_unterweisungen um wiederholungsIntervallMonate (int, nullable) erweitert
- [x] Backend: unterweisung.adminCreate – wiederholungsIntervallMonate speichern + naechsteFaelligkeit auto berechnen
- [x] Backend: unterweisung.bestaetigen – nach Bestätigung naechsteFaelligkeit automatisch neu setzen
- [x] Frontend Admin: Unterweisungs-Formular – Dropdown Wiederholung (einmalig/6M/12M/24M/36M)
- [x] Frontend MA: Bestätigungs-Button zeigt nächste Fälligkeit nach Bestätigung an

### Feature 2: Arbeitssicherheits-Audit-Log
- [x] DB: arbeitssicherheit_audit_log (id, aktion, bereich, referenzId, adminId, adminName, details, createdAt)
- [x] Backend: arbeitssicherheitRouter – auditLog bei gefaehrdung.create/update/delete + psa.create/rueckgabe/delete
- [x] Backend: arbeitssicherheitRouter – auditLog.list Procedure (Admin)
- [x] Frontend Admin: Neuer Sub-Tab "🔍 Audit-Log" in ArbeitssicherheitAdminTab.tsx

### Feature 3: Compliance-Gesamtübersicht
- [x] Backend: compliance.gesamtuebersicht – Procedure die alle Ampeln je MA zusammenführt (Erste-Hilfe, Führerschein, Unterweisungen, Datenschutz, Vorsorge)
- [x] Frontend Admin: ComplianceGesamtuebersicht.tsx – Tabelle MA-Zeile × Ampel-Spalten + Gesamt-Score
- [x] Frontend Admin: Filter nach Ampel-Status + CSV-Export
- [x] AdminPanel: neuer Tab "📊 Compliance" eingebunden

### Feature 4: Mitarbeiterakte vollständig
- [x] DB: 23 neue Felder: sozialversicherungsnummer, steuerklasse, steueridentnummer, iban, bic, bankname, krankenkasse, krankenversicherungsart, notfallkontaktName/Telefon/Beziehung, wochenstunden, monatslohn, stundenlohn, zuschlaege, probezeit, probeEnde, kuendigungsfrist, arbeitszeitmodell
- [x] Backend: updateStammdaten um alle neuen Felder erweitert
- [x] Backend: mitarbeiter.delete (Soft-Delete via aktiv=false, Admin-only)
- [x] Frontend Admin: MitarbeiterDetail.tsx – Stammdaten-Tab mit Vergütung, Sozialversicherung, Notfallkontakt, Probezeit
- [x] db.ts: getAllMitarbeiter() gibt alle neuen Felder zurück

### Feature 5: Urlaubstage-Automatik
- [x] Backend: urlaubsantraege.genehmigen – urlaubstageVerbraucht automatisch erhöht
- [x] Backend: urlaubsantraege.ablehnen/stornieren – Tage wieder gutgeschrieben
- [x] Backend: mitarbeiter.urlaubsKonto – Procedure gibt Jahresbudget/Verbraucht/Rest zurück
- [x] Frontend MA: Urlaub-Tab zeigt Fortschrittsbalken (Konto/Verbraucht/Rest) aktuell
- [x] Frontend Admin: Urlaub-Tab in Mitarbeiterakte zeigt vollständigen Verlauf + Konto-Anpassung

- [x] TypeScript: 0 Fehler

## 3 Features: MA-Formular + Compliance-KPI + Lohnkosten (05.08.2026)
- [x] Feature 1: MA-Anlegen-Formular – Beschäftigungsart, Urlaubstage/Jahr, Wochenstunden als Pflichtfelder
- [x] Feature 1: MA-Anlegen-Formular – Abschnitt "Vergütung" (Monatslohn/Stundenlohn, Zuschläge)
- [x] Feature 2: Backend: mitarbeiter.complianceScore – Gesamt-Quote (X/9 compliant)
- [x] Feature 2: Management-Dashboard – KPI-Karte "Compliance-Quote" mit Fortschrittsbalken
- [x] Feature 3: Backend: mitarbeiter.lohnkostenMonat – Monatslöhne + Stundenlöhne × geleistete Stunden
- [x] Feature 3: Admin-Panel – neuer Tab "💰 Lohnkosten" mit Tabelle + Balkendiagramm
- [x] TypeScript: 0 Fehler

## 3 Features: CSV-Export + Urlaubskonto-Automatik + Lohnkosten-Trend (05.08.2026)
- [x] Feature 1: LohnkostenTab – CSV-Export-Button (Monatstabelle als DATEV-kompatible CSV)
- [x] Feature 2: Urlaubskonto-Automatik – beim MA-Anlegen wird urlaubsKonto automatisch mit urlaubstageJahr initialisiert
- [x] Feature 2: Backend: mitarbeiterCreate initialisiert urlaubsVerbraucht=0, urlaubsJahr=aktuelles Jahr
- [x] Feature 3: Management-Dashboard – Lohnkosten-Trend Liniendiagramm (letzte 6 Monate)
- [x] Feature 3: Backend: compliance.lohnkostenTrend – Summe je Monat für letzte 6 Monate
- [x] TypeScript: 0 Fehler

## MA-Anlegen + Löschen (05.08.2026)
- [x] Backend: mitarbeiterDelete Procedure (Hard-Delete mit Audit-Log)
- [x] AdminPanel: "Neu anlegen"-Button öffnet vollständiges BottomSheet (alle Felder sichtbar)
- [x] AdminPanel: Lösch-Button pro Mitarbeiter mit Bestätigungsdialog (Name eintippen)
- [x] AdminPanel: Nach Anlegen/Löschen Liste automatisch aktualisieren
- [x] TypeScript: 0 Fehler

## MA-Export Excel + CSV (05.08.2026)
- [x] xlsx-Paket installieren (SheetJS)
- [x] Backend: admin.mitarbeiterExport Procedure – alle Felder inkl. Lohn, Urlaub, Compliance
- [x] AdminPanel: Export-Buttons "📥 Excel" und "📥 CSV" in der MA-Übersicht
- [x] CSV: UTF-8 BOM, Semikolon-getrennt, DATEV-kompatibel
- [x] Excel: Titelzeile fett, Spaltenbreiten automatisch, Dateiname mit Datum
- [x] TypeScript: 0 Fehler

## Arbeitssicherheits-Dashboard (05.08.2026)
- [x] Backend: arbeitssicherheit.dashboard Procedure (KPI-Zahlen, Ampel-Status)
- [x] Backend: arbeitssicherheit.unterweisungenFaellig Procedure (nach MA gruppiert)
- [x] Backend: arbeitssicherheit.gefaehrdungenFaellig Procedure (offene + überfällige)
- [x] ArbeitssicherheitDashboard.tsx: KPI-Karten (Grün/Gelb/Rot Ampel-Zähler)
- [x] ArbeitssicherheitDashboard.tsx: Unterweisungs-Tabelle mit Ampel-Badges pro MA
- [x] ArbeitssicherheitDashboard.tsx: Gefährdungsbeurteilungs-Tabelle mit Risikostufe
- [x] Navigation: AS-Dashboard in AdminPanel-Tabs + App.tsx Route einbinden
- [x] TypeScript: 0 Fehler

## Unterweisungs-PDF-Nachweis (05.08.2026)
- [x] unterweisungPdfGenerator.ts: Nachweis-Layout (Briefkopf, Thema, Datum, Unterschriftszeilen)
- [x] ArbeitssicherheitDashboard.tsx: "📄 PDF"-Button pro Unterweisung in der Tabelle
- [x] TypeScript: 0 Fehler
