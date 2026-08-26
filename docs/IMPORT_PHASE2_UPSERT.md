# Import Phase 2 – Idempotenter Kundenimport (Upsert / „Synchronisation")

Manuell ausgelöste Synchronisation: Ein Kundenimport erkennt Bestandskunden und
**aktualisiert** sie, statt Dubletten anzulegen. Dadurch ist ein erneuter Import
derselben Datei gefahrlos wiederholbar.

## Vorher / Nachher

| | Vorher (`main`) | Nachher (Phase 2) |
|---|---|---|
| Persistenz | pro Zeile `kunden.create` (nur INSERT) | ein Aufruf `kunden.upsertImport` (Upsert) |
| Bestandskunde | als „Duplikat" markiert und **übersprungen** | über Schlüssel erkannt und **aktualisiert** |
| Adresse | als `adresse` übergeben → vom Schema verworfen | korrekt auf `strasse`/`plz`/`ort` abgebildet |
| Kostenträger | nicht gespeichert | als Freitext (`kostentraeger`) gespeichert |
| Audit | – | pro Zeile `CREATE`/`UPDATE`/`kunde` + Batch `IMPORT`/`kunden` |

## Abgleichschlüssel

1. **Versicherungsnummer** (eindeutig, bevorzugt)
2. **Vor- + Nachname** (Fallback, wenn keine Versicherungsnummer vorhanden)

Leere Importwerte überschreiben bestehende Felder nicht (kein Datenverlust bei
Teil-Datensätzen). Dubletten innerhalb derselben Datei werden nach der ersten
Neuanlage ebenfalls als Aktualisierung behandelt.

## Aufbau

- `shared/kundenAbgleich.ts` – reine, getestete Logik: Index-Aufbau, Trefferermittlung,
  Klassifikation (neu/aktualisierung), Feld-Mapping. 12 Unit-Tests in
  `shared/kundenAbgleich.test.ts`.
- `server/routers.ts` → `kunden.upsertImport` – führt den Abgleich gegen den aktiven
  Kundenbestand aus, schreibt Audit-Einträge und den Import-Verlauf
  (`csv_import_protokolle`) und liefert `{ neu, aktualisiert, fehler, ergebnisse }`.
- `client/src/pages/KundenCsvImportTab.tsx` – Vorschau markiert Bestandskunden als
  „↻ wird aktualisiert"; das Ergebnis zeigt neu/aktualisiert getrennt.

Kein Schema-/Migrationsbedarf – es werden ausschließlich vorhandene Spalten und
Tabellen genutzt.

Stand: **TypeScript 0 Fehler · 139 Tests grün (3 übersprungen) · Build erfolgreich.**

## Auslösung

Manuell über die Import-Maske (Admin-Bereich). Es gibt bewusst keinen Zeitplan –
gemäß Abstimmung wird der Abgleich per Upload angestoßen. Ein späterer automatischer
Abruf (z. B. von einer HTTPS-Quelle) kann auf dieser Upsert-Basis ergänzt werden.
