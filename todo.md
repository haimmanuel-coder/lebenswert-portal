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

## Phase 16 – Vollständiges UI/UX-Redesign & neue Module ✅

### Design-System
- [x] Neues CSS-Design-System: LW-Tokens, Farben, Typografie, Animationen in index.css
- [x] Professionelle Klassen: lw-page, lw-card, lw-btn, lw-badge, lw-table, lw-grid

### Admin-Dashboard (Ampel-Visualisierungen)
- [x] AdminDashboard.tsx: Ampel-Kacheln für §45b, §45a, §39 (grün/gelb/rot nach Verbrauch)
- [x] KPI-Kacheln: Mitarbeiter, Kunden, Einsätze heute, offene Leistungsnachweise
- [x] Auslastungsanzeigen: Minijob/Teilzeit/Vollzeit-Verteilung
- [x] Backend: admin.dashboardStats-Route mit allen KPI-Daten

### Mitarbeiterakte
- [x] DB: mitarbeiterDokumente-Tabelle (mitarbeiterId, typ, titel, dateiUrl, dateiKey, ablaufdatum)
- [x] Backend: mitarbeiterakte.listDokumente, mitarbeiterakte.addDokument, mitarbeiterakte.deleteDokument
- [x] Frontend: Mitarbeiterakte.tsx mit Tabs (Zertifikate, Verträge, Krankmeldungen, Sonstiges)
- [x] Upload-Funktion für Dokumente (S3-Storage)

### Vertretungsverwaltung
- [x] DB: vertretungen-Tabelle (vertreterId, vertretenId, von, bis, grund, aktiv)
- [x] Backend: vertretungen.create, vertretungen.list, vertretungen.meineVertretungen, vertretungen.deactivate
- [x] Frontend: Vertretungen.tsx – Admin richtet ein, Mitarbeiter sieht eigene Vertretungen

### Logbuch
- [x] Frontend: Logbuch.tsx – Alle Systemaktivitäten mit Filter (Aktion, Bereich, Suche)
- [x] Farbcodierte Badges für Aktionstypen (Login, Erstellt, Geändert, Gelöscht, Export)

### DSGVO & Cookie-Banner
- [x] CookieBanner.tsx – DSGVO-konformer Cookie-Hinweis mit Details-Ansicht
- [x] Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO, Betroffenenrechte Art. 13 DSGVO
- [x] Einbindung in App.tsx

### Navigation
- [x] Alle 4 neuen Module in PortalApp.tsx eingebunden (Ampel-Dashboard, Mitarbeiterakte, Vertretungen, Logbuch)
- [x] Neue Sektion "Personalakte & System" im Admin-Menü

### Qualität
- [x] 0 TypeScript-Fehler
- [x] 33/33 Tests bestanden

## Phase 17 – Desktop-Sidebar & Rollenverwaltung

- [ ] PortalApp.tsx: Bottom-Tabs durch permanente linke Sidebar ersetzen (Desktop)
- [ ] Sidebar: 4 Sektionen (Übersicht, Kunden & Einsätze, Personal, Verwaltung)
- [ ] Sidebar: Responsive – auf Mobile als Drawer/Hamburger-Menü
- [ ] Sidebar: Aktiver Menüpunkt farblich hervorgehoben
- [ ] Sidebar: Mitarbeiter-Name und Avatar unten in der Sidebar
- [ ] Backend: admin.setRolle-Route (Admin setzt Rolle: admin|mitarbeiter)
- [ ] Backend: Alle Mitarbeiter mit aktueller Rolle abrufen
- [ ] Frontend: Rollenverwaltung.tsx – Mitarbeiter-Liste mit Rollen-Badge und Toggle-Button
- [ ] Frontend: Bestätigungs-Dialog vor Rollen-Änderung
- [ ] Navigation: Rollenverwaltung in Sidebar einbinden (Admin-only)

## Phase 17 – Desktop-Sidebar & Rollenverwaltung ✅
- [x] Desktop-Sidebar mit 4 Sektionen (Übersicht, Mitarbeiter, Kunden, Administration)
- [x] Responsives Mobile-Hamburger-Menü
- [x] Rollenverwaltung-Seite (Admin kann Rollen manuell zuteilen/entziehen)
- [x] Backend: admin.updateRolle-Route mit Audit-Log
- [x] 0 TypeScript-Fehler, 33/33 Tests bestanden

## Phase 18 – Unterschriften-Persistenz & Lösch-Buttons

- [ ] Unterschriften-Canvas: Unterschrift bleibt nach Zeichnen erhalten (kein Auto-Reset)
- [ ] Unterschriften-Canvas: "Neu unterschreiben"-Button zum manuellen Löschen
- [ ] Leistungsnachweise: Löschen-Button (mit Bestätigungsdialog)
- [ ] Leistungsnachweise: Bearbeiten-Button (Status zurücksetzen auf offen)
- [ ] Urlaubsanträge: Löschen-Button für eigene Anträge (Mitarbeiter) + Admin
- [ ] Krankmeldungen: Löschen-Button für eigene Einträge (Mitarbeiter) + Admin
- [ ] Kassenanfragen: Löschen-Button + Unterschrift neu zeichnen
- [ ] Backend: delete-Routen für Leistungsnachweise, Urlaubsanträge, Krankmeldungen

## Phase 16 – Unterschriften-Persistenz & Lösch-Buttons

- [x] SignatureCanvas: value-Prop für persistente Anzeige gespeicherter Unterschriften
- [x] SignatureCanvas: Neu-unterschreiben-Button (Löschen + neu zeichnen)
- [x] Einsaetze.tsx: Unterschriften werden nach Speichern stabil angezeigt
- [x] Leistungsnachweise.tsx: Unterschriften werden nach Speichern stabil angezeigt
- [x] Kassenanfrage.tsx: Unterschriften werden nach Speichern stabil angezeigt
- [x] Backend: deleteUrlaubsantrag in db.ts
- [x] Backend: deleteKrankmeldung in db.ts
- [x] Backend: deleteLeistung in db.ts
- [x] Backend: urlaub.delete tRPC-Route (eigene Anträge oder Admin)
- [x] Backend: krank.delete tRPC-Route (eigene Meldungen oder Admin)
- [x] Backend: leistungen.delete tRPC-Route (eigene Nachweise oder Admin)
- [x] Frontend: Lösch-Button in Urlaubsverwaltung.tsx
- [x] Frontend: Lösch-Button in Krankmeldung.tsx
- [x] Frontend: Lösch-Button in Leistungsnachweise.tsx

## Phase 17 – Touren-Vorausplanung, Admin-only Kundendaten, Mehrfach-Zuordnung

- [x] DB: kundenZuordnung um prioritaet (1-3), rolle (hauptbetreuer/vertretung), zugeordnetVon erweitert
- [x] DB: touren um titel, startzeit, endzeit, angelegtVon erweitert
- [x] Migration ausgeführt (ALTER TABLE)
- [x] db.ts: getZuordnungenForKunde – alle Mitarbeiter eines Kunden abrufen
- [x] db.ts: setZuordnungenForKunde – max. 3 Mitarbeiter pro Kunde setzen (mit Fehler bei Überschreitung)
- [x] db.ts: isMitarbeiterZugeordnet – Zuordnungsprüfung
- [x] routers.ts: TRPCError Import hinzugefügt
- [x] routers.ts: touren.create – 2-Wochen-Validierung (max. 14 Tage in Zukunft)
- [x] routers.ts: kunden.getZuordnungen – Admin-only Route
- [x] routers.ts: kunden.setZuordnungen – Admin-only Route mit Max-3-Validierung
- [x] Frontend: Tourenplanung.tsx – Datum-Input mit min=heute, max=heute+14 Tage
- [x] Frontend: Kundenliste.tsx – Bearbeiten/Anlegen/Deaktivieren bereits Admin-only
- [x] Frontend: AdminPanel.tsx – Zuordnungs-Tab auf Kunden-basierte Mehrfach-Zuordnung umgestellt
- [x] 0 TypeScript-Fehler

## Phase 18 – Automatische Budget-Abrechnung aus Leistungsnachweisen

- [x] db.ts: createLeistung – nach Eintrag sofort verbraucht-Feld des Kunden erhöhen
- [x] db.ts: deleteLeistung – beim Löschen verbraucht-Feld wieder reduzieren
- [x] db.ts: updateLeistungStatus – bei Status-Änderung keine Doppel-Abrechnung
- [x] db.ts: neue Hilfsfunktion adjustKundeVerbraucht (zentrale Logik)
- [x] routers.ts: leistungen.create – Budget-Abrechnung automatisch in db.ts
- [x] routers.ts: leistungen.delete – Budget-Rückbuchung automatisch in db.ts
- [x] Frontend: Leistungsnachweise.tsx – Budget-Restanzeige mit Fortschrittsbalken
- [x] Frontend: Kundenliste.tsx – Budget-Fortschrittsbalken aktualisiert sich live (bereits vorhanden)
