# Prüfbericht Admin-Panel

**Datum:** 28.07.2026
**Prüfgegenstand:** Repository `haimmanuel-coder/lebenswert-portal`, Branch `claude/lebenswert-portal-implementation-rpgr7q`
**Prüfart:** Statisches Code-Audit (Quellcodeanalyse)

---

## 0. Vorbemerkung zum Prüfgegenstand

Die Angaben im Prüfauftrag weichen vom untersuchten Repository ab. Das ist für
die Bewertung der Ergebnisse wesentlich:

| Angabe im Auftrag | Befund im Repository |
|---|---|
| PostgreSQL | **MySQL** (`mysql2` 3.15, Drizzle-Dialekt `mysql`) |
| Hosting Railway | Manus (`lebensnahhub-ppxappev.manus.space`) |
| 73 Kunden | 70 Kunden laut Projekthistorie |
| Domain `portal.lebenswert-betreuung.de` | erreichbar, aber nicht die bisher bearbeitete Adresse |

**Acht der genannten Module existieren in diesem Repository nicht:**
Leistungskosten, Sicherheitsunterweisungen, Compliance-Ampel,
Compliance-Gesamt, Arbeitssicherheit, AS-Dashboard, CSV-Import, Kunden-Import.
Eine Volltextsuche über `client/src/pages/` liefert dafür null Treffer.

**Folgerung:** Die produktiv laufende Anwendung liegt sehr wahrscheinlich in
einem anderen Repository. Die nachstehenden Befunde gelten ausschließlich für
den hier vorliegenden Code. Die Abschnitte zu den acht fehlenden Modulen
konnten nicht geprüft werden.

**Nicht prüfbar mangels Zugang:** Laufzeitverhalten, tatsächliche Ladezeiten,
Client- und Server-Logs der Produktivumgebung, TLS-Konfiguration des Hostings,
tatsächliche Datenmengen.

---

## 1. Kritische Sicherheits- und DSGVO-Mängel

### K-1 · Unauthentifizierter Zugriff auf alle Führerschein-Daten

**Status: KRITISCH** · Priorität **Hoch**

`server/routers.ts:2200`

```ts
list: portalProcedure.query(async ({ ctx }) => {
  return getFuehrerscheinChecks(ctx.mitarbeiterId ?? undefined);
}),
```

`portalProcedure` prüft die Anmeldung **nicht** – es setzt lediglich
`ctx.mitarbeiterId` auf `null`, wenn kein gültiges Token vorliegt
(`server/portalAuth.ts:69–79`). Erst `portalProtected` wirft `UNAUTHORIZED`.

Ohne Token wird daher `getFuehrerscheinChecks(undefined)` aufgerufen. Diese
Funktion liefert bei fehlendem Parameter **alle** Datensätze
(`server/db.ts:927–936`):

```ts
if (mitarbeiterId) { /* WHERE mitarbeiter_id = ... */ }
const r = await db.execute(sql`SELECT * FROM fuehrerschein_checks ORDER BY ...`);
```

**Auswirkung:** Ein nicht angemeldeter Aufrufer erhält sämtliche
Führerschein-Kontrollen aller Mitarbeiter, einschließlich Foto-URLs
(`foto_url`), Prüfdaten und Bemerkungen. Personenbezogene Daten nach Art. 4
DSGVO, Ausweisdokumente.

**Reproduktion:** tRPC-Endpunkt `fuehrerschein.list` ohne Cookie und ohne
`Authorization`-Header aufrufen.

**Maßnahme:** `portalProcedure` → `portalProtected`. Zusätzlich in
`getFuehrerscheinChecks` den Parameter verpflichtend machen, damit ein
fehlender Wert nicht mehr implizit „alle" bedeutet.

---

### K-2 · Unauthentifiziertes Anlegen von Neukunden inklusive Unterschriften

**Status: KRITISCH** · Priorität **Hoch**

`server/routers.ts:2246`

```ts
create: portalProcedure
  .input(z.object({ vorname, nachname, geburtsdatum, ... ,
                    vollmachtUnterschrift, kundenUnterschrift, ... }))
  .mutation(async ({ input, ctx }) => {
    await createNeukundenaufnahme({ ...input, erstelltVon: ctx.mitarbeiterId ?? undefined });
  }),
```

**Auswirkung:** Ohne Anmeldung lassen sich Kundendatensätze mit Geburtsdatum,
Anschrift, Pflegegrad, Versicherungsnummer und **digitalen
Unterschriftsbildern** anlegen. `erstelltVon` bleibt dabei leer, der Vorgang
ist nicht zurechenbar. Neben dem Datenschutzverstoß besteht ein
Manipulationsrisiko (untergeschobene Vollmachten).

**Maßnahme:** `portalProcedure` → `portalProtected`, `erstelltVon` verpflichtend.

---

### K-3 · Unauthentifiziertes Schreiben von Führerschein-Checks

**Status: KRITISCH** · Priorität **Hoch**

`server/routers.ts:2209` – `create: portalProcedure`, mit
`mitarbeiterId: ctx.mitarbeiterId ?? 0`.

Ohne Anmeldung entstehen Datensätze mit `mitarbeiterId = 0`, die keinem
Mitarbeiter zuzuordnen sind und die Compliance-Auswertung verfälschen.

**Maßnahme:** `portalProtected` erzwingen.

---

### K-4 · Hartcodiertes JWT-Fallback-Secret in einem öffentlichen Repository

**Status: KRITISCH** · Priorität **Hoch**

`server/portalAuth.ts:8`

```ts
const JWT_SECRET_TEXT = process.env.JWT_SECRET || "lebenswert-secret-key";
```

Das Repository ist auf GitHub **öffentlich** einsehbar. Ist `JWT_SECRET` in der
Zielumgebung nicht gesetzt, kann jeder mit diesem allgemein bekannten Wert
gültige Sitzungstoken für beliebige `mitarbeiterId` signieren – auch für
Administratorkonten. Das umgeht die Authentifizierung vollständig.

Dieselbe Zeichenkette dient über `CREDENTIAL_ENCRYPTION_KEY ||
JWT_SECRET_TEXT` (`server/portalAuth.ts:121`) zusätzlich als Schlüssel für
`encryptSecret`. Bei fehlenden Umgebungsvariablen sind damit auch die
2FA-Geheimnisse und Integrations-Zugangsdaten entschlüsselbar.

**Maßnahme:** Fallback ersatzlos entfernen und den Prozessstart abbrechen,
wenn `JWT_SECRET` fehlt. Anschließend Secret rotieren – alle bestehenden
Token werden dadurch ungültig, was hier beabsichtigt ist.

---

### K-5 · Kein Zugriffsprotokoll für Kundendaten (Art. 9 DSGVO)

**Status: KRITISCH** · Priorität **Hoch**

Von 70 `createAuditLog`-Aufrufen in `server/routers.ts` protokolliert **keiner**
einen Lesezugriff:

```
createAuditLog gesamt:            70
davon mit action READ/SELECT:      0
```

`kunden.list` (`server/routers.ts:874`) und `kunden.detail` (`:877`) schreiben
keinen Audit-Eintrag. Verarbeitet werden Gesundheits- und Pflegedaten
(`einsaetze.gesundheit`, `einsaetze.bericht`, Pflegegrad) – besondere
Kategorien nach Art. 9 DSGVO.

Ohne Zugriffsprotokoll ist weder die Rechenschaftspflicht nach Art. 5 Abs. 2
DSGVO erfüllbar noch eine Auskunft nach Art. 15 Abs. 1 lit. c über
Empfänger möglich. Ein unbefugter Massenabruf bliebe unbemerkt.

**Maßnahme:** Lesezugriffe auf Kundendaten protokollieren (Zeitpunkt, Nutzer,
betroffener Kunde, Zweck). Empfohlen als tRPC-Middleware, damit keine Route
vergessen wird.

---

### K-6 · Datenexporte werden nicht protokolliert

**Status: KRITISCH** · Priorität **Hoch**

Der Export-Router (`server/routers.ts:1553 ff.`) enthält **null**
`createAuditLog`-Aufrufe. Exporte erzeugen vollständige CSV-Dateien mit
Kunden- und Leistungsdaten (`:1788`).

Ein Export ist der datenschutzrechtlich schwerwiegendste Vorgang überhaupt –
er löst die Daten aus der Zugriffskontrolle der Anwendung. Genau dieser
Vorgang ist derzeit nicht nachvollziehbar.

**Maßnahme:** Jeden Export mit Nutzer, Zeitpunkt, Umfang und Filterkriterien
protokollieren. Prüfen, ob die Rolle `buchhaltung` – die
`finanzen:exportieren` besitzt (`server/portalAuth.ts:31`) – tatsächlich
Kundenstammdaten exportieren können soll.

---

### K-7 · Gesundheitsdaten unverschlüsselt gespeichert

**Status: KRITISCH** · Priorität **Mittel**

Verschlüsselung (`encryptSecret`) wird ausschließlich für 2FA-Geheimnisse und
Integrations-Zugangsdaten verwendet. Die Gesundheitsdaten selbst liegen im
Klartext:

```ts
bericht: text("bericht"),                                    // drizzle/schema.ts:195
gesundheit: mysqlEnum("gesundheit", [...]),                  // :196
unterschriftKunde: text("unterschriftKunde"),                // :200
```

Bei Datenbank-Backups, Log-Dumps oder einem Hosting-Zwischenfall sind
Art.-9-Daten unmittelbar lesbar. Art. 32 Abs. 1 lit. a DSGVO nennt
Verschlüsselung ausdrücklich als angemessene Maßnahme.

**Maßnahme:** Mindestens Verschlüsselung auf Speicherebene (Datenbank-Ebene)
sicherstellen und dokumentieren. Für Freitextfelder mit Diagnosebezug
Feldverschlüsselung erwägen. Transportverschlüsselung ist über das Hosting
gegeben, konnte hier aber nicht verifiziert werden.

---

### K-8 · Keine referenzielle Integrität in der Datenbank

**Status: KRITISCH** · Priorität **Hoch**

Über alle Migrationsdateien hinweg ist **kein einziger** Fremdschlüssel
definiert:

```
FOREIGN KEY / REFERENCES in drizzle/*.sql: 0
```

Verknüpfungen wie `einsaetze.kundenId`, `kundenZuordnung.mitarbeiterId` oder
`leistungen.kundenId` sind reine `int`-Spalten ohne Constraint.

**Auswirkung:** Verwaiste Datensätze entstehen unbemerkt. Wird ein Kunde hart
gelöscht (`kunden.hardDelete`, `server/routers.ts:963`), verweisen dessen
Einsätze, Leistungsnachweise und Budgettransaktionen ins Leere. Die
Anwendung zeigt dann „Kunde #17" statt eines Namens; Abrechnungen können
stillschweigend falsche Summen liefern.

Die geprüfte Löschlogik verlässt sich vollständig auf Anwendungscode. Bei
direkten Datenbankzugriffen – etwa durch Wartungsskripte – greift keine
Absicherung.

**Maßnahme:** Fremdschlüssel mit `ON DELETE RESTRICT` für abrechnungsrelevante
Verknüpfungen ergänzen. Vorher verwaiste Datensätze bereinigen, sonst
scheitert das Anlegen der Constraints.

---

## 2. Weitere Sicherheitsbefunde

| Nr. | Status | Befund | Datei | Priorität |
|---|---|---|---|---|
| S-1 | **Mangel** | **Kein Rate-Limiting.** Weder `express-rate-limit` noch eine eigene Drosselung vorhanden. `portal.login` (`routers.ts:683`) ist unbegrenzt aufrufbar → Brute-Force auf Zugangsdaten und 2FA-Codes möglich. | `server/_core/index.ts` | Hoch |
| S-2 | **Mangel** | **Kein CSRF-Schutz bei `sameSite: "none"`.** Das Sitzungs-Cookie wird bei Cross-Site-Anfragen mitgesendet (`server/_core/cookies.ts:43`), ohne Token- oder Origin-Prüfung. | `server/_core/cookies.ts` | Hoch |
| S-3 | **Mangel** | **Token-Laufzeit 30 Tage** (`portalAuth.ts:44`) ohne Widerrufsmöglichkeit. Für Art.-9-Daten unangemessen lang; ein entwendetes Token bleibt einen Monat gültig. | `server/portalAuth.ts:40–45` | Hoch |
| S-4 | **Mangel** | **Refresh-Token nicht angebunden.** Tabelle `refreshTokens` und `createRefreshToken` existieren, es gibt aber keine `/refresh`-Route. Die lange Token-Laufzeit ist daher nicht durch Rotation abgesichert. | `server/routers.ts:152` | Mittel |
| S-5 | **Mangel** | `admin.textbausteine` liegt im Admin-Namensraum, nutzt aber `portalProcedure` – Lesezugriff ohne Anmeldung. Geringe Schutzwürdigkeit der Daten, aber inkonsistent zur übrigen Absicherung. | `server/routers.ts:1931` | Niedrig |
| S-6 | **Hinweis** | Passwortanforderung bei Mitarbeiter-Anlage: `z.string().min(6)` (`:1704`). Sechs Zeichen ohne Komplexitätsanforderung sind für Konten mit Zugriff auf Gesundheitsdaten zu schwach. | `server/routers.ts:1704` | Mittel |

---

## 3. Modulübersicht

Geprüft wurden die tatsächlich vorhandenen Module.

| Modul | Status | Befund | Maßnahme | Prio |
|---|---|---|---|---|
| **Mitarbeiter** | OK | CRUD vollständig (`admin.mitarbeiterList/Create/Update`), durchgängig `adminProcedure`. Validierung über Zod. | Passwortregel verschärfen (S-6) | Niedrig |
| **Kunden** | **Mangel** | CRUD vollständig; `create`/`update`/`updateBudget`/`archivieren`/`hardDelete` sind Admin-geschützt. **Aber:** kein Audit-Log für Lesezugriffe (K-5), keine Fremdschlüssel (K-8). `kunden.list` liefert alle Datensätze ohne Limit. | K-5, K-8 umsetzen | Hoch |
| **Zuordnung** | OK | `setZuordnungen` mit `adminProcedure`, Begrenzung auf 3 Mitarbeiter serverseitig durchgesetzt (`.max(3)`), Audit-Eintrag vorhanden. | – | – |
| **Abschluss / Monatsabschluss** | **Mangel** | `export.monatspaket` ist Admin-geschützt, erzeugt aber CSV ohne Protokollierung (K-6). | K-6 umsetzen | Hoch |
| **Formularvorlagen** | OK | CRUD über `pflichtenheftRouter`, Rollenprüfung vorhanden. | – | – |
| **DSGVO-Dokumente** | **Mangel** | Zustimmungen werden erfasst und versioniert. Aufbewahrungsfristen nach SGB XI (§ 104: zehn Jahre) sind jedoch **nirgends abgebildet** – weder als Feld noch als automatische Löschroutine. | Löschkonzept mit Fristen ergänzen | Hoch |
| **Führerschein-Checks** | **KRITISCH** | K-1 (unauthentifiziertes Lesen aller Daten), K-3 (unauthentifiziertes Schreiben). | sofort absichern | Hoch |
| **Unterschriften-Archiv** | **Mangel** | Unterschriften liegen als Base64-Text in `einsaetze`, `leistungen`, `kassenanfragen` – unverschlüsselt (K-7), ohne eigene Zugriffskontrolle. | K-7 prüfen | Mittel |
| **Lohnkosten** | OK | `planung.minijobUebersicht` prüft die Rolle über `darfAllesSehen()`; Mitarbeiter sehen nur eigene Werte. | – | – |
| **Onboarding** | OK | Reine Frontend-Tour (`OnboardingTour.tsx`), keine Datenverarbeitung. | – | – |
| **Einstellungen** | OK | `planung.setzeSatz` ist auf `roleProcedure(["admin"])` beschränkt, Änderungen werden auditiert. | – | – |
| **Kundenliste (Export/Bearbeitung)** | **Mangel** | Bearbeitung Admin-geschützt. Export nicht protokolliert (K-6); Rolle `buchhaltung` besitzt `finanzen:exportieren`, was Kundenstammdaten einschließen kann. | K-6, Rollenumfang prüfen | Hoch |
| Leistungskosten | **nicht prüfbar** | Modul im Repository nicht vorhanden | Repository klären | – |
| Sicherheitsunterweisungen | **nicht prüfbar** | Modul nicht vorhanden | Repository klären | – |
| Compliance-Ampel / -Gesamt | **nicht prüfbar** | Module nicht vorhanden | Repository klären | – |
| Arbeitssicherheit / AS-Dashboard | **nicht prüfbar** | Module nicht vorhanden | Repository klären | – |
| CSV-Import / Kunden-Import | **nicht prüfbar** | Module nicht vorhanden – Prüfpunkt 5 (Encoding, Duplikaterkennung, Fehlerbehandlung) entfällt vollständig | Repository klären | – |

---

## 4. Datenintegrität und Validierung

| Aspekt | Status | Befund |
|---|---|---|
| Serverseitige Validierung | **OK** | Durchgängig Zod-Schemas an den tRPC-Eingängen; die Prüfung erfolgt serverseitig, nicht nur im Browser. Formate wie `email()` und Wertebereiche (`min(1).max(5)` bei Pflegegrad) sind hinterlegt. |
| Doppelte Prüfung Anzeige/Speicherung | **OK** | Vorbildlich in der Einsatzplanung: `pruefeTermin()` bedient Live-Vorschau und Speichervorgang, sodass Anzeige und Prüfung nicht auseinanderlaufen können. |
| Referenzielle Integrität | **KRITISCH** | Siehe K-8 – keine Fremdschlüssel. |
| Löschverhalten | **Mangel** | Soft-Delete ist umgesetzt und filtert korrekt. `kunden.hardDelete` anonymisiert den Kunden, lässt aber verknüpfte Einsätze und Leistungen unberührt → verwaiste Verweise. |
| Kennzahlen ohne Caching-Drift | **OK** | Alle Kennzahlen werden je Anfrage frisch aus der Datenbank berechnet; kein clientseitiger Zwischenspeicher mit eigener Gültigkeitsdauer. Ein Abweichen zwischen Anzeige und Datenbank ist dadurch ausgeschlossen. |

---

## 5. Performance

| Nr. | Status | Befund | Priorität |
|---|---|---|---|
| P-1 | **Mangel** | **Paginierung wirkungslos.** `kunden.listPaginiert` (`routers.ts:1055–1062`) lädt über `getAllKunden()` **alle** Datensätze und schneidet erst im Arbeitsspeicher zu (`.slice()`). Bei 73 Kunden unkritisch, bei 1.000+ steigen Speicherbedarf und Antwortzeit linear. | Mittel |
| P-2 | **Mangel** | **N+1-Abfragen.** `getAllMitarbeiter()` wird innerhalb von Schleifen aufgerufen – `routers.ts:2365` (je verspäteter Neukunden-Push) und `:2425` (je abgelaufener Vertretung). Bei 50 offenen Vorgängen entstehen 50 vollständige Mitarbeiterabfragen. | Mittel |
| P-3 | **Hinweis** | `planung.dashboard` lädt alle Kunden und berechnet die Budgetlage in der Anwendung statt per Aggregat-Query. Bei 1.000+ Kunden spürbar. | Niedrig |
| P-4 | **OK** | Indizes für die Planungsabfragen sind mit Migration 0007 angelegt (`idx_einsaetze_ma_datum`, `idx_einsaetze_kunde_datum` u. a.). | – |

**Hinweis:** Tatsächliche Ladezeiten konnten mangels Zugang zur laufenden
Anwendung nicht gemessen werden. Die Aussagen beruhen auf der Analyse des
Abfrageverhaltens.

---

## 6. Fehlerbehandlung und Robustheit

| Aspekt | Status | Befund |
|---|---|---|
| Ungültige IDs | **OK** | `z.number().int().positive()` fängt unzulässige Werte ab; nicht gefundene Datensätze liefern `TRPCError NOT_FOUND`. |
| Fehlende Datenbank | **OK** | `getDb()` liefert `null` statt zu werfen; Leselisten geben leere Arrays zurück, Schreibvorgänge einen sprechenden Fehler. |
| Leere Datensätze | **OK** | Frontend-Seiten zeigen Leerzustände statt weißer Seite; `ErrorBoundary.tsx` fängt Renderfehler ab. |
| Netzwerkabbruch | **Teilweise** | Offline-Warteschlange nur für den Einsatzabschluss (`useOfflineSync`); andere Schreibvorgänge gehen bei Abbruch verloren. |
| Massenanfragen | **Mangel** | Kein Rate-Limiting (S-1). |

---

## 7. UI/UX-Konsistenz

| Aspekt | Status | Befund |
|---|---|---|
| Interaktionsmuster | **Mangel** | Zwei parallele Gestaltungswelten: shadcn/ui-Komponenten (`Kassenanfrage`, `Textbausteine`) neben umfangreichen Inline-Styles (`Dashboard`, `Einsatzplanung`, `PortalApp`). Farbwerte wie `#4a8c3f` sind vielfach hart kodiert statt über Design-Token gepflegt. |
| Statusfarben | **OK** | Ampellogik im Backend einheitlich (`ueberschritten` / `vorwarnung` / normal); Frontend bildet sie konsistent auf Rot/Gelb/Grün ab. |
| Responsivität | **OK** | Mobile Navigation als Schublade, Rasterlayouts über `auto-fit`/`minmax`; breite Tabellen scrollen in eigenem Container. |
| Barrierefreiheit | **Hinweis** | Nicht systematisch geprüft. Auffällig: Statusinformationen werden teilweise ausschließlich über Farbe vermittelt. |

---

## 8. Maßnahmen nach Dringlichkeit

**Sofort (vor weiterem Produktivbetrieb):**

1. K-1, K-2, K-3 – `portalProcedure` → `portalProtected` bei
   `fuehrerschein.list`, `fuehrerschein.create`, `neukundenaufnahme.create`
2. K-4 – JWT-Fallback entfernen, Secret rotieren
3. S-1 – Rate-Limiting für `portal.login` und die Passwort-Reset-Routen

**Kurzfristig (DSGVO-Rechenschaftspflicht):**

4. K-5 – Zugriffsprotokoll für Kundendaten
5. K-6 – Protokollierung aller Exporte
6. S-2 – CSRF-Schutz oder `sameSite: "lax"`
7. S-3/S-4 – Token-Laufzeit verkürzen, Refresh-Route anbinden
8. Löschkonzept mit Aufbewahrungsfristen nach SGB XI

**Mittelfristig:**

9. K-8 – Fremdschlüssel ergänzen
10. K-7 – Verschlüsselung der Gesundheitsdaten prüfen und dokumentieren
11. P-1 – Paginierung auf `LIMIT`/`OFFSET` umstellen
12. P-2 – Mitarbeiterliste vor die Schleife ziehen

---

## 9. Prüfumfang und Grenzen

**Geprüft:** Quellcode des Repositories – Routenabsicherung, Middleware,
Eingabevalidierung, Rollenmodell, Datenbankschema und Migrationen,
Abfrageverhalten, Audit-Aufrufe, Fehlerbehandlung.

**Nicht geprüft:** Laufzeitverhalten der Produktivumgebung, tatsächliche
Antwortzeiten unter Last, TLS-Konfiguration des Hostings, Server- und
Client-Logs, Wirksamkeit der Maßnahmen in der real eingesetzten Version.

**Wesentliche Einschränkung:** Wie unter Abschnitt 0 dargelegt, weicht der
geprüfte Code in Datenbanktechnologie, Hosting und Modulumfang von der
Auftragsbeschreibung ab. Für die acht nicht vorhandenen Module – darunter der
gesamte Prüfpunkt 5 (CSV-/Kunden-Import) – liegt kein Prüfergebnis vor. Sollte
die produktive Anwendung aus einem anderen Repository stammen, ist dieser
Bericht für sie **nicht** aussagekräftig.
