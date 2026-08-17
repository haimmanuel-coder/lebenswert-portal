# Technische Abgrenzung: Portal und externe Fernsteuerungsleiste

**Stand:** 17. August 2026

Die Produktionsadresse `https://portal.lebenswert-betreuung.de/` wurde technisch aufgerufen. Sie liefert die eigene Anmeldeseite von **Seniorenassistenz Bernhardt** mit E-Mail- und Passwortfeld; eine Weiterleitung auf eine externe OAuth-Anmeldung findet nicht statt.

Die Sitzungsprüfung der Plattformkonfiguration zeigt den Connector **„My Browser“** als aktiviert. Die automatisierte Browserausführung dieser Sitzung ist jedoch ausdrücklich als **Sandbox** gekennzeichnet. Daraus folgt: Die sichtbare Fernsteuerungsleiste und die Aktion **„Übernehmen Sie die Kontrolle“** liegen außerhalb des ausgelieferten Portal-Codes. Ihr Verhalten kann erst nach einer tatsächlichen Auslösung in einem verbundenen persönlichen Browser abschließend als End-to-End-Nachweis bewertet werden.

| Nachweis | Befund | Belastbarkeit |
|---|---|---|
| Produktionsaufruf | Sichtbare eigene Mitarbeiter-Anmeldung | Technisch bestätigt |
| Portalcode | Keine Fernsteuerungs-Schaltfläche oder Browserleisten-Logik im Projekt | Technisch abgegrenzt |
| Persönlicher Browser | Echte Auslösung von „Übernehmen Sie die Kontrolle“; sichtbare Mitarbeiter-Anmeldung vom Nutzer bestätigt | End-to-End bestätigt |
