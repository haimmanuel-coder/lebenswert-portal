# Domain-Prüfung: portal.lebenswert-betreuung.de

**Geprüft am:** 04.09.2026

Die Subdomain `portal.lebenswert-betreuung.de` löst per CNAME auf `lebensnahhub-ppxappev.manus.space` auf. Der HTTPS-Aufruf antwortet mit HTTP 200 und aktiviert HSTS. Im Browser wird die eigene Anmeldeseite „Seniorenassistenz Bernhardt – Mitarbeiter-Portal“ mit E-Mail-Feld, Passwortfeld und Anmeldung sichtbar ausgeliefert.

Damit ist die benutzerdefinierte Domain technisch erreichbar und über eine verschlüsselte Verbindung an das Portal angebunden.

## Verwaltungsnachweis

Die angemeldete Projektübersicht zeigt den Arbeitsbereich „Lebenswert Betreuung“ und den Eintrag „Lebenswert Betreuung Mitarbeiter-Portal Copy“. Die Navigation der Verwaltungsoberfläche liefert in der automatisierten Ansicht jedoch noch keinen eindeutig sichtbaren Domainstatus für den aktiven Website-Arbeitsbereich. Der technische DNS-, HTTPS- und Login-Nachweis ist bereits vollständig; der sichtbare Verwaltungsstatus bleibt als gesonderte Prüfung offen.

Bei der weiteren Navigation wurde der Eintrag „Lebenswert Betreuung Mitarbeiter-Portal Copy“ als **nicht veröffentlichte Kopie** identifiziert. Dieser Arbeitsbereich ist nicht die laufende Portal-App und darf deshalb nicht für eine Domainänderung verwendet werden.

Im Projektbereich „Lebenswert Betreuung“ ist unter „Website“ derzeit noch keine Website-Verknüpfung sichtbar; stattdessen wird die Aktion „Add“ angeboten. Die aktive Portal-App muss daher zuerst korrekt mit diesem Projektbereich verbunden werden, bevor dort ein sichtbarer Domainstatus nachgewiesen werden kann.

Der Verwaltungsdialog „Add website to project“ zeigt mehrere Websites. Die gesuchte Karte „Lebenswert Betreuung – Mitarbeiter-Portal“ ist dort als nicht veröffentlicht gelistet. Eine abweichende Website wurde im Dialog nur vorübergehend ausgewählt, jedoch **nicht gespeichert**; es wurde keine Projektverknüpfung verändert.

Die in diesem Dialog sichtbaren Auswahlsteuerungen sind in der automatisierten DOM-Ansicht nicht als reguläre Radioelemente zugänglich. Eine verlässliche Auswahl der richtigen aktiven Website kann deshalb nicht ohne Risiko für eine falsche Projektverknüpfung automatisiert gespeichert werden.
