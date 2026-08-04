# Datenbank-Übersicht – Lebenswert Betreuung Mitarbeiter-Portal

Gesamt: **54 Anwendungstabellen** + 1 Migrations-Tabelle (`__drizzle_migrations`)
Stand: August 2026

---

## 1. Kern-Stammdaten

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `mitarbeiter` | mitarbeiter | 2+ | id, vorname, nachname, email, telefon, adresse, beschaeftigungsart, position, eintrittsdatum, aktiv |
| `kunden` | kunden | 2+ | id, vorname, nachname, geburtsdatum, adresse, versicherungsnummer, kostentraeger, pflegegrad, pflegegradSeit, aktiv |
| `users` | users | 2+ | id, openId, name, email, role, loginMethod, createdAt |
| `kostentraeger` | kostentraeger | 2+ | id, name, ikNummer, typ, strasse, plz, ort, telefon, email |
| `kundenZuordnung` | kundenZuordnung | 7 | id, mitarbeiterId, kundenId, prioritaet, rolle, zugeordnetVon, createdAt |

---

## 2. Einsätze & Leistungen

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `einsaetze` | einsaetze | 6+ | id, mitarbeiterId, kundenId, datum, startzeit, dauerStunden, status, unterschriftMitarbeiter, unterschriftKunde |
| `leistungen` | leistungen | 4+ | id, mitarbeiterId, kundenId, monat, paragraph, stunden, anzahlEinsaetze, betrag, status |
| `fahrten` | fahrten | 5+ | id, mitarbeiterId, kundenId, datum, vonOrt, nachOrt, km, zweck, verguetung |
| `budgetTransaktionen` | budgetTransaktionen | 7 | id, kundenId, leistungId, mitarbeiterId, typ, paragraph, betrag |
| `jahresbudgets` | jahresbudgets | 11 | id, kundenId, leistungsbereich, jahresbudgetCent, verbrauchtCent, gueltigAb, gueltigBis, stundensatzCent |
| `paragraphSaetze` | paragraphSaetze | 3 | id, paragraph, satzProStunde |
| `monatsabschluesse` | monatsabschluesse | 2+ | id, monat, mitarbeiterId, status, csvKey |

---

## 3. Tourenplanung

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `touren` | touren | 6 | id, mitarbeiterId, datum, status, notizen, titel |
| `tourEinsaetze` | tourEinsaetze | 4 | id, tourId, einsatzId, reihenfolge |
| `planungsWarnungen` | planungsWarnungen | 2+ | id, code, meldung, datum |
| `terminRueckmeldungen` | terminRueckmeldungen | 8 | id, einsatzId, mitarbeiterId, aktion, grund, wunschDatum, wunschZeit, createdAt |
| `einsatzAenderungen` | einsatzAenderungen | 9 | id, einsatzId, aenderungstyp, aenderungsgrund, alteDaten, neueDaten, geaendertVonId |

---

## 4. Mitarbeiter-Verwaltung & HR

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `urlaubsantraege` | urlaubsantraege | 12 | id, mitarbeiterId, von, bis, tage, notizen, status, adminNotiz, createdAt |
| `krankmeldungen` | krankmeldungen | 11 | id, mitarbeiterId, von, bis, tage, notizen, auAttest, createdAt |
| `verfuegbarkeiten` | verfuegbarkeiten | 11 | id, mitarbeiterId, wochentag, vonZeit, bisZeit, gueltigVon, gueltigBis, status, notiz |
| `arbeitszeitKonten` | arbeitszeitKonten | 3+ | id, mitarbeiterId, monat, sollStunden, istStunden, differenz |
| `vertretungen` | vertretungen | 6 | id, vertreterId, vertretenId, von, bis, grund |
| `vertretungsUebernahmen` | vertretungsUebernahmen | 7 | id, urlaubsantragId, kundenId, vertreterId, bestaetigtAt, vollzugriffBis |

---

## 5. Mitarbeiter-Dokumente & Compliance

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `mitarbeiterDokumente` | mitarbeiterDokumente | 4+ | id, mitarbeiterId, typ, bezeichnung, dateiKey, dateiUrl, ablaufDatum |
| `mitarbeiterBerechtigungen` | mitarbeiterBerechtigungen | 3+ | id, mitarbeiterId, modul, berechtigung |
| `mitarbeiterZweiFaktor` | mitarbeiterZweiFaktor | 4 | id, mitarbeiterId, twoFactorEnabled, twoFactorSecret |

---

## 6. Besuchsberichte & Dokumentation

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `besuchsberichte` | besuchsberichte | 17 | id, einsatzId, kundenId, mitarbeiterId, datum, dauerMinuten, taetigkeiten, beobachtungen, besonderheiten, naechsteSchritte, kiVorschlag, status, freigegebenVon |
| `besuchsberichtDateien` | besuchsberichtDateien | 3+ | id, berichtId, dateiKey, dateiUrl, mimeType |
| `textbausteine` | textbausteine | 2+ | id, titel, inhalt, kategorie, paragraph |

---

## 7. Neukundenaufnahme & Kommunikation

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `neukundenPushBestaetigung` | neukundenPushBestaetigung | 6 | id, kundenId, mitarbeiterId, bestaetigtAt, eskalationsstufe, createdAt |
| `ebriefLog` | ebriefLog | 5+ | id, mitarbeiterId, kundenId, kostentraegerId, betreff, inhalt, status, versendetAt |
| `formularVorlagen` | formularVorlagen | 2+ | id, name, inhalt, typ |

---

## 8. Benachrichtigungen & Push

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `notifications` | notifications | 3+ | id, empfaengerId, titel, inhalt, gelesen, createdAt |
| `pushSubscriptions` | pushSubscriptions | 5 | id, mitarbeiterId, endpoint, p256dh, auth |

---

## 9. Authentifizierung & Sicherheit

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `passwordResets` | passwordResets | 3+ | id, mitarbeiterId, token, ablaufAt, genutzt |
| `refreshTokens` | refreshTokens | 3+ | id, mitarbeiterId, token, ablaufAt |
| `zweiFaktorCodes` | zweiFaktorCodes | 3+ | id, mitarbeiterId, codeHash, ablaufAt |

---

## 10. Rollen & Berechtigungen (RBAC)

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `roles` | roles | 2+ | id, key, bezeichnung |
| `permissions` | permissions | 2+ | id, key, bezeichnung |
| `rolePermissions` | role_permissions | 2 | roleId, permissionId |
| `employeeRoles` | employee_roles | 4 | employeeId, roleId, assignedAt, assignedBy |

---

## 11. Datenschutz & DSGVO

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `datenschutzDokumente` | datenschutzDokumente | 3+ | id, typ, titel, inhalt, version, gueltigAb |
| `datenschutzZustimmungen` | datenschutzZustimmungen | 4+ | id, mitarbeiterId, dokumentId, dokumentVersion, zugestimmtAt |
| `einwilligungen` | einwilligungen | 6 | id, personTyp, personId, zweck, erteilt, dokumentVersion |
| `loeschAnfragen` | loeschAnfragen | 8 | id, personTyp, personId, grund, status, bearbeitetVon, createdAt |

---

## 12. Analysen, Controlling & Backups

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `analyseSnapshots` | analyseSnapshots | 2+ | id, monat, daten, createdAt |
| `controllingSnapshots` | controllingSnapshots | 2+ | id, monat, daten, createdAt |
| `prognoseSnapshots` | prognoseSnapshots | 2+ | id, monat, daten, createdAt |
| `backupLaeufe` | backupLaeufe | 4+ | id, typ, status, speicherort, startedAt, beendetAt |
| `backupProtokolle` | backupProtokolle | 2+ | id, typ, meldung, createdAt |

---

## 13. Integrationen & Audit

| Tabelle | DB-Name | Spalten | Wichtigste Felder |
|---|---|---|---|
| `integrationen` | integrationen | 3+ | id, anbieter, bezeichnung, apiKey, status |
| `integrationsLaeufe` | integrationsLaeufe | 9 | id, integrationId, gestartetVon, typ, status, anzahlDatensaetze, meldung, createdAt, beendetAt |
| `auditLogs` | auditLogs | 3+ | id, mitarbeiterId, action, details, ipAdresse, createdAt |
| `aenderungsprotokoll` | aenderungsprotokoll | – | id, mitarbeiterId, aktion, details, createdAt |

---

## Systemtabelle

| Tabelle | Zweck |
|---|---|
| `__drizzle_migrations` | Drizzle ORM – Versionsverwaltung der Datenbankmigrationen |
