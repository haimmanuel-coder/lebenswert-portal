# Einsatzplanung, Budgetlogik und Löschkonzept

Diese Dokumentation beschreibt die Erweiterung des Lebenswert-Portals um eine
durchgängige Einsatzplanung. Sie richtet sich an Entwickler und an die
fachliche Administration.

---

## 1. Fachliche Grundregeln

### 1.1 Zwei getrennte Stundensätze

Die wichtigste fachliche Unterscheidung im gesamten System:

| Begriff | Wert | Verwendung |
|---|---|---|
| **Verrechnungssatz** | §45a/§45b 36,00 €/Std.<br>§39 46,00 €/Std. | Abrechnung gegenüber dem Kostenträger. **Nur dieser Satz** bestimmt, wie viele Betreuungsstunden aus dem Kundenbudget finanzierbar sind. |
| **Stundenlohn** | 16,00 €/Std. | Interne Personalkosten. **Nur** für Lohnkosten- und Minijob-Berechnung. |

Die Sätze stammen aus `shared/leistungssaetze.ts` – der einzigen gültigen
Preisquelle des Systems. `shared/planungsLogik.ts` importiert sie von dort und
definiert bewusst **keine** eigenen Werte, damit nicht erneut zwei
voneinander abweichende Preismodelle entstehen.

Die verfügbaren Betreuungsstunden ergeben sich **ausschließlich** aus dem
Verrechnungssatz des jeweiligen Paragraphen:

```
Verfügbares Budget ÷ Stundensatz des Paragraphen = verbleibende Stunden

Beispiel §45b:  347,00 € ÷ 36,00 €/Std. = 9,64 Std.
```

Eine Berechnung über den Stundenlohn (347 € ÷ 16 € = 21,69 Std.) wäre fachlich
falsch und wird durch einen Test explizit ausgeschlossen.

### 1.2 Weitere Konstanten

| Konstante | Wert | Bedeutung |
|---|---|---|
| `MINIJOB_GRENZE` | 603,00 €/Monat | Ab Überschreitung erscheint eine Live-Warnung |
| `ANFAHRT_PAUSCHALE` | 6,00 €/Einsatz | Wird **immer** budgetwirksam mitgerechnet |
| `MINDEST_DAUER_STUNDEN` | 1,5 Std. | Mindestbetreuungszeit je Einsatz |
| `BUDGET_WARNSCHWELLE_ANTEIL` | 10 % | Ab hier gilt ein Kundenbudget als kritisch |
| `ARBEITSZEIT_VON` / `_BIS` | 06:00 – 22:00 | Regulärer Arbeitszeitrahmen |

Alle Konstanten stehen zentral in `shared/planungsLogik.ts`. Die
Verrechnungssätze, der Stundenlohn und die Anfahrtspauschale lassen sich
zusätzlich betriebsindividuell über die Tabelle `paragraphSaetze` pflegen
(Route `planung.setzeSatz`, nur Administratoren).

### 1.3 Stundenberechnung

Stunden werden **niemals manuell eingegeben**, sondern immer aus Start- und
Endzeit berechnet:

```
09:00 – 11:30  →  2,5 Stunden
```

Das Eingabefeld „Stunden" in der Planungsoberfläche ist schreibgeschützt und
zeigt nur das Rechenergebnis.

### 1.4 Lohnkosten

```
Gesamtstunden × 16,00 € = Lohnkosten

Beispiel: 2,5 Std. × 16,00 € = 40,00 €
```

### 1.5 Zwei Abrechnungsparagraphen je Termin

Reicht das Budget eines Paragraphen nicht aus, kann im selben Termin ein
zweiter Paragraph ergänzt werden. Beide werden **getrennt gespeichert**
(`paragraph`/`stunden1`/`kosten1` und `paragraph2`/`stunden2`/`kosten2`), sind
aber im selben Termin sichtbar. Die Anfahrtspauschale wird im Verhältnis der
Stundenanteile aufgeteilt.

```
Beispiel: 4 Std. gesamt, davon 1 Std. über §39
  §45a: 3 Std. × 36 € = 108,00 € + 4,50 € Anfahrt = 112,50 €
  §39 : 1 Std. × 46 € =  46,00 € + 1,50 € Anfahrt =  47,50 €
  Summe: 160,00 €
```

Jeder Paragraph rechnet mit seinem eigenen Satz.

---

## 2. Datenbankänderungen

Migration: `drizzle/0007_einsatzplanung.sql`

Die Migration ist **additiv, idempotent und rückwärtskompatibel**:

* Es werden nur neue Spalten und Tabellen angelegt.
* Keine bestehende Spalte wird umbenannt, verkleinert oder gelöscht.
* Alle neuen Spalten sind NULL-fähig oder haben Standardwerte.
* Jede Spalten- und Indexanlage prüft vorher, ob das Objekt bereits existiert,
  und ob die Zieltabelle vorhanden ist – die Migration kann gefahrlos mehrfach
  laufen.

### 2.1 Erweiterte Tabelle `einsaetze`

| Spalte | Typ | Zweck |
|---|---|---|
| `endzeit` | `time` | Grundlage der automatischen Stundenberechnung |
| `paragraph2` | `enum('45b','45a','39')` | Zweiter Abrechnungsparagraph |
| `stunden1` / `stunden2` | `decimal(5,2)` | Stundenaufteilung je Paragraph |
| `kosten1` / `kosten2` | `decimal(8,2)` | Budgetwirksame Kosten je Paragraph |
| `lohnkosten` | `decimal(8,2)` | Gesamtstunden × Stundenlohn |
| `notizen` | `text` | Planungshinweise (Schlüssel, Haustiere, Medikamente) |
| `budgetGebucht` | `boolean` | Verhindert doppelte Budgetabbuchung (siehe 6.1) |
| `geplantVon` | `int` | Wer den Termin angelegt hat |
| `geloeschtAt`/`geloeschtVon`/`loeschgrund` | | Soft-Delete |

`dauerStunden` bleibt erhalten und wird weiterhin befüllt, damit **alle
bestehenden Auswertungen unverändert weiterlaufen**.

### 2.2 Neue Tabellen

**`paragraphSaetze`** – historisierte Verrechnungssätze je Paragraph
(`satzProStunde`, `lohnProStunde`, `anfahrtPauschale`, `gueltigAb`, `aktiv`).
Maßgeblich ist der jüngste aktive Eintrag mit `gueltigAb <= heute`.

**`planungsWarnungen`** – protokollierte Warnungen (Minijob, Budget,
Konflikte) mit `bestaetigtAt`/`bestaetigtVon` und `geloeschtAt`/`geloeschtVon`.

### 2.3 Nachgetragene Tabellen

`kassenanfragen`, `neukundenaufnahmen` und `fuehrerschein_checks` werden von
`server/db.ts` per SQL angesprochen, besaßen aber bisher **keine Migration**.
Fehlt die Tabelle in der Zieldatenbank, schlagen sämtliche Abfragen dieser
Module fehl – unter anderem das Laden der Kassenanfragen-Seite. Die Migration
legt sie mit `CREATE TABLE IF NOT EXISTS` nach.

### 2.4 Löschstatus für weitere Tabellen

`geloeschtAt` und `geloeschtVon` wurden ergänzt für: `leistungen`, `fahrten`,
`urlaubsantraege`, `krankmeldungen`, `touren`, `kassenanfragen`,
`neukundenaufnahmen`, `fuehrerschein_checks`.

Alle Listenabfragen in `server/db.ts` filtern gelöschte Datensätze über
`isNull(...geloeschtAt)` aus.

### 2.5 Datenmigration der Bestandsdaten

Bestehende Einsätze besitzen nur `startzeit` und `dauerStunden`. Die Migration
trägt `endzeit`, `stunden1`, `lohnkosten` und `kosten1` nach, damit auch
historische Termine in der neuen Planungsansicht vollständig erscheinen.
Datensätze ohne Zeitangaben bleiben unverändert (`NULL`).

### 2.6 Indizes

Neu angelegt für die Planungsabfragen: `idx_einsaetze_datum`,
`idx_einsaetze_ma_datum`, `idx_einsaetze_kunde_datum`,
`idx_einsaetze_geloescht`, `idx_urlaub_zeitraum`, `idx_krank_zeitraum`,
`idx_touren_ma_datum`, `idx_warnungen_offen`.

### 2.7 Migration ausführen

```bash
mysql "$DATABASE_URL" < drizzle/0007_einsatzplanung.sql
```

Die Migration wurde am 28.07.2026 gegen eine echte MySQL-kompatible Datenbank
verprobt: leere Datenbank, alle vorherigen Migrationen eingespielt, danach
0007 – fehlerfrei. Ein zweiter Lauf bestätigt die Idempotenz.

Die Datenmigration der Bestandsdaten wurde stichprobenartig geprüft:

| Ausgangsdaten | Ergebnis |
|---|---|
| §45b, 09:00, 2,5 Std. | Endzeit 11:30 · Lohn 40,00 € · Budget 96,00 € (2,5 × 36 € + 6 €) |
| §39, 14:00, 3 Std. | Endzeit 17:00 · Lohn 48,00 € · Budget 144,00 € (3 × **46 €** + 6 €) |
| ohne Zeitangaben | bleibt unverändert (`NULL`) |

### 2.8 Hinweis zum Migrationsverzeichnis

Beim Verproben ist aufgefallen, dass **27 der 51 im Drizzle-Schema definierten
Tabellen keine Migrationsdatei besitzen** – darunter `urlaubsantraege`,
`krankmeldungen`, `touren`, `notifications` und die RBAC-Tabellen. Ebenso
fehlen einzelne Spalten wie `kunden.budget45b` oder `einsaetze.anfahrtPauschale`.
Sie wurden historisch per `drizzle-kit push` direkt aus dem Schema erzeugt.

Auf einer gewachsenen Produktionsdatenbank existieren diese Objekte
höchstwahrscheinlich. Eine neu aufgesetzte Datenbank lässt sich aus dem
Migrationsverzeichnis allein jedoch **nicht** vollständig herstellen.

Diese Migration geht damit defensiv um: Fehlt eine Zieltabelle, wird die
betroffene Änderung übersprungen statt abzubrechen. Die von der
Datenmigration benötigte Spalte `einsaetze.anfahrtPauschale` wird bei Bedarf
nachgezogen.

Zusätzlich liegt jetzt eine Basismigration bei:
**`drizzle/baseline/0000_basisschema.sql`** (51 Tabellen).

Sie wurde mit `npx drizzle-kit export --sql` unmittelbar aus
`drizzle/schema.ts` erzeugt – nicht von Hand gepflegt – und schließt die
Lücke im Migrationsverzeichnis.

**Neue Datenbank aufsetzen:**

```bash
mysql "$DATABASE_URL" < drizzle/baseline/0000_basisschema.sql
mysql "$DATABASE_URL" < drizzle/0007_einsatzplanung.sql
```

Der zweite Schritt ergänzt die Spalten der Einsatzplanung sowie die drei
Tabellen, die ausschließlich per SQL angesprochen werden und deshalb nicht im
Drizzle-Schema stehen (`kassenanfragen`, `neukundenaufnahmen`,
`fuehrerschein_checks`). Ergebnis: 54 Tabellen.

**Sicherheit:** Alle Anweisungen verwenden `CREATE TABLE IF NOT EXISTS`. Die
Datei verändert, löscht oder überschreibt nichts und kann daher auch gegen
eine bestehende Datenbank ausgeführt werden – dort ergänzt sie ausschließlich
fehlende Tabellen.

Gegengeprüft am 28.07.2026:

| Ausgangslage | Ergebnis |
|---|---|
| Leere Datenbank | 54 Tabellen, anschließend `0007` fehlerfrei |
| Bestehende Datenbank mit Daten (24 Tabellen) | 27 fehlende Tabellen ergänzt, **Daten unverändert** |

Die Basismigration ist **kein Ersatz** für die nummerierten Migrationen und
wird nicht in deren Reihenfolge eingereiht – sie liegt deshalb im eigenen
Verzeichnis `drizzle/baseline/`.

---

## 3. Validierungsregeln

Alle Regeln werden **live während der Eingabe** geprüft (Route
`planung.pruefe`) und beim Speichern erneut serverseitig durchgesetzt. Beide
Wege nutzen dieselbe Funktion `pruefeTermin`, sodass Anzeige und Prüfung nie
auseinanderlaufen können.

| Code | Schwere | Regel |
|---|---|---|
| `mitarbeiter_fehlt` | blockierend | Mitarbeiter muss gewählt sein |
| `kunde_fehlt` | blockierend | Fehlende Kundenzuordnung |
| `datum_fehlt` | blockierend | Gültiges Datum erforderlich |
| `startzeit_fehlt` / `endzeit_fehlt` | blockierend | Fehlende Uhrzeiten |
| `paragraph_fehlt` | blockierend | Abrechnungsparagraph erforderlich |
| `dauer_ungueltig` | blockierend | Endzeit muss nach Startzeit liegen |
| `mindestdauer_unterschritten` | warnung | Unter 1,5 Std.; Eskalation an den Admin |
| `dauer_zu_lang` | warnung | Über 12 Std. – Plausibilitätsprüfung |
| `ausserhalb_arbeitszeit` | warnung | Außerhalb 06:00–22:00 Uhr |
| `mitarbeiter_im_urlaub` | blockierend | Genehmigter Urlaub am Termintag |
| `mitarbeiter_krank` | blockierend | Krankmeldung am Termintag |
| `doppelbuchung_mitarbeiter` | blockierend | Überschneidung beim Mitarbeiter |
| `doppelbuchung_kunde` | blockierend | Überschneidung beim Kunden |
| `budget_nicht_ausreichend` | blockierend¹ | Restbudget deckt die Kosten nicht |
| `budget_fast_erschoepft` | hinweis | Weniger als 1,5 Std. Restbudget |
| `minijob_ueberschritten` | warnung | Über 603 €/Monat |
| `minijob_fast_erreicht` | hinweis | Ab 85 % der Minijob-Grenze |
| `paragraph2_doppelt` | blockierend | Zweiter Paragraph gleich dem ersten |
| `paragraph2_stunden_fehlen` | blockierend | Stundenanteil fehlt |
| `paragraph2_stunden_zu_hoch` | blockierend | Anteil größer als Gesamtdauer |

¹ Administratoren können die Budgetsperre bewusst übersteuern
(Kontrollkästchen im Formular, `uebersteuern: true`). Der Vorgang wird im
Audit-Log protokolliert. Formale Fehler und Doppelbuchungen bleiben immer
blockierend.

**Minijob-Grenze:** Teilzeit- und Vollzeitkräfte unterliegen ihr nicht – die
Prüfung berücksichtigt `mitarbeiter.beschaeftigungsart`.

---

## 4. Benutzerrechte

| Rolle | Planung sehen | Planen / ändern | Löschen | Warnungen bestätigen | Budget übersteuern |
|---|---|---|---|---|---|
| **Mitarbeiter** | nur eigene | nein | nein | nein | nein |
| **Teamleitung** | alle | ja | ja | ja | nein |
| **Buchhaltung** | alle (lesend) | nein | nein | nein | nein |
| **Administrator** | alle | ja | ja | ja | ja |

### Tourenplanung

Die Tourenplanung wird **nicht automatisch erzeugt**, sondern vom jeweiligen
Mitarbeiter manuell festgelegt.

* Mitarbeiter ändern **ausschließlich die Reihenfolge ihrer eigenen Tour**.
* Einsatzzeiten und Kundenzuweisungen bleiben dabei unangetastet – die
  Route `planung.touren.speichereReihenfolge` akzeptiert nur Einsatz-IDs, die
  dem Mitarbeiter an diesem Tag tatsächlich zugeordnet sind.
* Jede Änderung wird mit Zeitstempel und Benutzer protokolliert
  (`touren.reihenfolgeGeaendertVon` / `reihenfolgeGeaendertAt` und Audit-Log).
* Teamleitung und Administration sehen und ordnen alle Touren.
* Der Routenvorschlag ist optional und wird erst nach ausdrücklicher
  Bestätigung des Mitarbeiters gespeichert.

---

## 5. Löschkonzept

Überall, wo Daten angelegt werden, besitzt der Administrator eine
Löschfunktion. Gelöscht wird grundsätzlich per **Soft-Delete**: Der Datensatz
bleibt für Abrechnung und Audit erhalten, verschwindet aber aus allen Listen.

Generische Route: `planung.loescheDatensatz({ bereich, id, grund })`

Unterstützte Bereiche: `einsatz`, `leistung`, `fahrt`, `urlaub`,
`krankmeldung`, `tour`, `warnung`, `kassenanfrage`, `neukundenaufnahme`,
`fuehrerschein`.

Zusätzlich vorhandene Speziallöschungen: `planung.loesche` (Termin inklusive
Budgetrückbuchung), `planung.touren.loesche`, `urlaub.delete`,
`krank.delete`, `leistungen.delete`, `fahrten.delete`,
`admin.textbausteineDelete`, `notifications.delete`,
`notifications.deleteGelesene`, `kunden.archivieren`, `kunden.hardDelete`.

### Bestätigen und Löschen von Meldungen

Warnungen durchlaufen zwei Schritte:

1. `planung.warnungen.bestaetige` – Teamleitung/Admin bestätigt die Meldung.
2. `planung.warnungen.loesche` bzw. `loescheBestaetigte` – die Meldung wird
   aus dem Arbeitsbereich entfernt.

Damit blockieren bestätigte Meldungen den Arbeitsbereich nicht dauerhaft.

---

## 6. Budgetbuchung und Transaktionssicherheit

### 6.1 Schutz vor doppelter Abbuchung

Es existieren zwei Buchungswege:

* **Einsatzplanung** (`planung.erstelle`) reserviert das Budget **sofort bei
  der Planung**, damit parallele Planungen dasselbe Guthaben nicht doppelt
  verplanen.
* **Einsatzabschluss** (`einsaetze.updateStatus`) bucht traditionell erst
  beim Abschluss ab.

Ohne Absicherung würde ein über die Planung angelegter Termin beim Abschluss
ein **zweites Mal** abgebucht. Das Feld `einsaetze.budgetGebucht` verhindert
das:

* Die Planung setzt es beim Anlegen auf `true`.
* `updateEinsatzStatus` bricht die Abbuchung ab, wenn es bereits gesetzt ist,
  und setzt es andernfalls nach erfolgreicher Buchung.
* Eine Stornierung setzt es zurück, damit eine spätere Buchung wieder möglich
  ist.

Altdatensätze stehen auf `false` und werden unverändert erst beim Abschluss
gebucht – bestehendes Verhalten bleibt erhalten.


* Beim Anlegen eines Termins wird das Budget **sofort reserviert**, damit
  parallele Planungen dasselbe Guthaben nicht doppelt verplanen.
* Beim Ändern wird die alte Buchung zunächst storniert und anschließend neu
  gebucht – auch bei Wechsel des Paragraphen bleibt der Verbrauch exakt.
* Beim Absagen oder Löschen fließt das reservierte Budget zurück.
* Jede Buchung läuft in einer **Datenbanktransaktion** und schreibt einen
  Eintrag in `budgetTransaktionen` (Budgethistorie). Budget und Historie
  können dadurch nicht auseinanderlaufen.
* Der Verbrauch kann nie unter null fallen (Schutz vor Mehrfach-Stornos).

---

## 7. Neue und geänderte Dateien

### Neu

| Datei | Inhalt |
|---|---|
| `shared/planungsLogik.ts` | Zentrale Berechnungslogik (Frontend + Backend) |
| `shared/planungsLogik.test.ts` | 51 Tests der Berechnungs- und Validierungsregeln |
| `server/planungDb.ts` | Datenzugriff der Einsatzplanung |
| `server/planungRouter.ts` | tRPC-Router `planung.*` |
|  `drizzle/0007_einsatzplanung.sql` | Migration |
| `client/src/components/AuswahlFeld.tsx` | Durchsuchbare Auswahl (Kunden, Mitarbeiter, Kassen) |
| `client/src/contexts/NavigationContext.tsx` | Seitenübergreifende Navigation |
| `client/src/pages/Einsatzplanung.tsx` | Planungsoberfläche mit Terminassistent |
| `client/src/pages/MeineTour.tsx` | Manuelle Tourenplanung durch den Mitarbeiter |
| `drizzle/baseline/0000_basisschema.sql` | Basisschema aller 51 Tabellen (aus dem Schema erzeugt) |

### Geändert

| Datei | Änderung |
|---|---|
| `drizzle/schema.ts` | Neue Spalten und Tabellen |
| `server/db.ts` | Soft-Delete-Filter in allen Listenabfragen |
| `server/routers.ts` | `planung`-Router, Löschrouten für Benachrichtigungen und Textbausteine |
| `client/src/pages/Dashboard.tsx` | 13 zusätzliche Kennzahlen, Warnungsliste |
| `client/src/pages/AdminDashboard.tsx` | Schnellzugriffe funktionsfähig |
| `client/src/pages/Kalender.tsx` | Urlaub, Krankheit, Feiertage, Touren, Mitarbeiterfarben |
| `client/src/pages/Kassenanfrage.tsx` | Kundenauswahl repariert, Suche, Löschen |
| `client/src/pages/Benachrichtigungen.tsx` | Bugfix `gelesen`, Löschfunktion |
| `client/src/pages/Textbausteine.tsx` | Löschfunktion |
| `client/src/pages/PortalApp.tsx` | Navigation, neue Seiten, Badge-Bugfix |
| `vitest.config.ts` | `shared/` in die Testausführung aufgenommen |

---

## 8. Behobene Fehler

1. **Kundenauswahl in Kassenanfragen ohne Funktion.** Das portalierte
   Radix-Auswahlmenü schloss sich beim Scrollen im Sheet und bot bei 70 Kunden
   keine Suche. Ersetzt durch `AuswahlFeld` (Suche, Tastaturbedienung, rendert
   im Dokumentfluss). IDs werden als Zahl geführt statt als String, wodurch
   keine leeren Werte mehr gespeichert werden können.

2. **Fehlende Datenbanktabellen.** `kassenanfragen`, `neukundenaufnahmen` und
   `fuehrerschein_checks` besaßen keine Migration. Nachgetragen.

3. **Schnellzugriffe ohne Funktion.** Die Kacheln im Ampel-Dashboard waren
   `<div>`-Elemente ohne `onClick`. Sie sind jetzt Schaltflächen mit
   Navigationsziel; zwei weitere Ziele wurden ergänzt.

4. **Benachrichtigungs-Badge dauerhaft falsch.** Frontend prüfte `gelesenAt`,
   das Datenbankfeld heißt `gelesen`. Dadurch galten alle Meldungen als
   ungelesen. In `Benachrichtigungen.tsx` und `PortalApp.tsx` korrigiert.

5. **Zeitzonenfehler bei Kalenderdaten.** `DATE`-Spalten liefert der Treiber
   als UTC-Mitternacht. Beim Auslesen über die lokale Zeitzone verschob sich
   das Datum in westlichen Zeitzonen um einen Tag. `zuDatumsString` erkennt
   reine Mitternachtszeitpunkte und liest sie in UTC.

6. **Gelöschte Datensätze blieben sichtbar.** Alle Listenabfragen filtern
   jetzt `geloeschtAt`.

---

## 9. Qualitätssicherung

```bash
pnpm tsc --noEmit   # 0 Fehler
pnpm test           # 81 bestanden
```

Die drei fehlschlagenden Tests in `server/webpush.test.ts` prüfen das
Vorhandensein der Umgebungsvariablen `VAPID_PUBLIC_KEY` und
`VAPID_PRIVATE_KEY`. Sie schlagen in Umgebungen ohne hinterlegte Secrets
erwartungsgemäß fehl (siehe Phase 11: bewusstes „graceful disable") und sind
kein Defekt der Anwendung.
