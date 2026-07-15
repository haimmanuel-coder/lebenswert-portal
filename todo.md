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
- [ ] Alle Seiten mit useAuth (Manus OAuth) statt usePortalAuth scannen
- [ ] Falsche Imports auf usePortalAuth umstellen

### 2. Fahrtenbuch-Löschfunktion
- [ ] Backend: fahrten.delete Mutation (mit Audit-Log)
- [ ] Frontend: Löschen-Button mit Sicherheitsabfrage (AlertDialog)

### 3. Tourenplanung-Kalender (Drag-and-Drop)
- [ ] 2-Wochen-Kalender mit Zeitraster (Stunden-Slots)
- [ ] Kunden-Sidebar mit zugewiesenen Kunden (Drag-Quelle)
- [ ] Drag-and-Drop: Kunde auf Zeitslot ziehen → Tour erstellen
- [ ] Tour-Chips verschiebbar (Drag innerhalb Kalender)
- [ ] Abwesenheits-Konflikt-Warnung (Urlaub/Krank)

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
