# Loginprüfung – 31. August 2026

## Befund

Die angezeigte Meldung **„E-Mail oder Passwort ungültig“** war keine technische Störung des Portals. Der sichere Audit-Abgleich weist für dasselbe aktive, anonymisierte Konto zuerst eine fehlgeschlagene Passwortprüfung um **16:04:58 Uhr** und anschließend eine erfolgreiche Anmeldung um **16:05:07 Uhr** aus.

| Prüfbereich | Ergebnis |
|---|---|
| Kontoaktivierung | Aktiv |
| Erzwungener Passwortwechsel | Nicht offen |
| Zwei-Faktor-Anmeldung | Nicht aktiviert |
| Loginrate | Kein Limit erreicht; nachfolgende API-Antwort meldete 299 verfügbare Aufrufe im Minutenfenster |
| Erfolgsnachweis | Erfolgreiches Login desselben Kontos neun Sekunden nach der Fehlermeldung |

## Maßnahme

Es wurde **kein Passwort zurückgesetzt** und keine Kontoeinstellung geändert. Dies vermeidet einen unnötigen Zugangseingriff. Die bestehende Fehlermeldung bleibt absichtlich allgemein, damit sie nicht verrät, ob eine E-Mail-Adresse registriert ist.

## Regression

Die Portal-Loginvalidierung einschließlich unbekannter E-Mail-Adresse, leerem Passwort, Abmeldung und Zugriffsschutz wurde mit **28 Tests** erfolgreich ausgeführt. Die eigentliche erfolgreiche Anmeldung ist zusätzlich durch den anonymisierten Auditnachweis belegt.
