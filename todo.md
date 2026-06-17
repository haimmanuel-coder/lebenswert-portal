# Lebensnah Betreuung – Mitarbeiter-Portal TODO

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
