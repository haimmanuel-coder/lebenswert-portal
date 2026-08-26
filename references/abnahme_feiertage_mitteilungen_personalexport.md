# Abnahme: Feiertage, Pflichtmitteilungen und Personalaktenexport

**Stand:** 26. August 2026

| Bereich | Technischer Nachweis | Ergebnis |
|---|---|---|
| Feiertage nach Bundesland | 54 Tests der zentralen Planungslogik sowie 8 Tests der Urlaubslogik | Bundes-, Länder- und Wochenendfeiertage werden in der Urlaubsberechnung korrekt berücksichtigt. |
| Pflichtmitteilungen | 1 eigener Regressionstest und bestätigte Heartbeat-Registrierung | Offene Pflichtbestätigungen werden täglich um 08:00 UTC idempotent erinnert; die Adminansicht zeigt offene und heute erinnerte Einträge. |
| Personalaktenexport | 2 spezielle Regressionstests für CSV-Inhalt, Dateiname, Audit-Vertrag und Client-Aufruf | Der Export ist admin-geschützt, erzeugt eine Excel-kompatible CSV und protokolliert jeden Abruf im Audit-Log. |
| Gesamtstand | TypeScript-Prüfung ohne Befund; Vitest: 22 Testdateien, 135 Tests erfolgreich | Abgenommen |

## Admin-Testweg

Öffnen Sie im Admin-Panel den Bereich **Einstellungen**. Wählen Sie unter **„Bundesland für Urlaubstage“** den tatsächlichen Arbeitsort des Betriebs und speichern Sie die Auswahl. Prüfen Sie anschließend in einer Urlaubsvorschau einen Arbeitstag, der nur in diesem Bundesland ein Feiertag ist.

Öffnen Sie danach **Kommunikation → Mitteilungen**. Die beiden Kennzahlen zeigen offene Pflichtbestätigungen und die Zahl der am aktuellen Tag ohne Doppelungen verschickten Erinnerungen. Der tägliche Job ist als `pflichtmitteilungen-erinnerung` registriert.

Unter **Einstellungen → Personalakten-Historie exportieren** lädt der Button die CSV-Datei herunter. Sie enthält Stammdaten, jede Änderung des Wochenarbeitsmusters und alle nicht gelöschten Urlaubsanträge. Der Abruf wird mit der Ressource `personalakte_arbeitsmuster_urlaub` im Audit-Log vermerkt.
