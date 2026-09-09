# GitHub-Arbeitsweise

Dieses Dokument beschreibt den verbindlichen, einfachen Ablauf für Änderungen am Mitarbeiterportal. Ziel ist es, dass jede Änderung nachvollziehbar bleibt und erst nach einer automatischen Prüfung in den Hauptzweig `main` gelangt.

> **Grundsatz:** Direkte Änderungen an `main` sind nicht vorgesehen. Jede Änderung beginnt in einem eigenen Arbeitszweig und wird über einen Pull Request geprüft.

## Der einfache Ablauf

| Schritt | Was ist zu tun? | Warum ist das wichtig? |
|---|---|---|
| 1. Arbeitszweig | Für eine Aufgabe einen neuen Branch anlegen, z. B. `feature/kundenbudget-auswertung`. | Änderungen bleiben von der produktiven Hauptlinie getrennt. |
| 2. Kleine, klare Commits | Änderungen in verständlichen Abschnitten speichern, z. B. `fix: Kundenname in Terminplanung anzeigen`. | Später ist nachvollziehbar, was geändert wurde. |
| 3. Pull Request | Einen Pull Request von dem Arbeitszweig nach `main` erstellen. | Dort werden Zweck, Risiken und Testweg festgehalten. |
| 4. Automatische Prüfung | Warten, bis **build (20.x)** und **build (22.x)** jeweils grün sind. | Damit werden Kompatibilität und Tests vor dem Zusammenführen geprüft. |
| 5. Inhaltliche Prüfung | Die Pull-Request-Vorlage vollständig ausfüllen und offene Gesprächspunkte klären. | Datenschutz-, Rollen- und Abrechnungsfolgen werden bewusst betrachtet. |
| 6. Zusammenführen | Erst bei grünen Prüfungen den Pull Request nach `main` zusammenführen. | `main` bleibt ein kontrollierter, funktionierender Stand. |

## Verbindliche Schutzregeln für `main`

Der Branch `main` ist über eine aktive GitHub-Regel geschützt. Pull Requests sind verpflichtend. Die Statusprüfungen **build (20.x)** und **build (22.x)** müssen erfolgreich sein. Direkte, nicht nachvollziehbare Aktualisierungen und das Löschen des Branches sind nicht vorgesehen. Für die Zusammenführung wird der vom Repository zugelassene Merge-Weg verwendet.

## Was niemals in einen Commit gehört

Passwörter, Startpasswörter, Token, API-Schlüssel, Sitzungsdaten, personenbezogene Testdaten, echte Mitarbeiter- oder Kundendokumente sowie PDF-Dateien mit Zugangsdaten dürfen niemals in GitHub gespeichert werden. Für Zugangskarten und Dokumente wird ausschließlich der geschützte externe Speicher mit zeitlich begrenztem Abruf verwendet.

## Änderungsprotokoll führen

Jede größere fachliche Änderung wird im Pull Request kurz dokumentiert. Dazu gehören insbesondere Anpassungen an Datenschutz, Rollenrechten, Kundendaten, Budgetlogik, Leistungsnachweisen, Terminplanung, Login oder Abrechnung. Als einfache Vorlage dient `docs/AENDERUNGSPROTOKOLL.md`.

## Bei fehlgeschlagenen Prüfungen

Eine rote GitHub-Prüfung wird nicht umgangen. Zuerst wird die Fehlermeldung gelesen, dann nur der betroffene Bereich korrigiert und erneut geprüft. Erst wenn beide Build-Prüfungen grün sind, darf der Pull Request zusammengeführt werden.
