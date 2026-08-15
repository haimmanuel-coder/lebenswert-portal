# Sichtprüfung mobiler Login – 15. August 2026

Die Login-Seite wurde nach der Überlaufkorrektur in zwei Viewports geprüft. Zusätzlich wurde der Remote-nahe Viewport über das Browser-Debug-Protokoll gemessen:

| Viewport | Sichtbarer Befund | Ergebnis |
|---|---|---|
| 828 × 1792 px | Login-Karte steht vollständig innerhalb des sichtbaren Bereichs. Logo, E-Mail-Feld, Passwortfeld, Passwort-Auge und Anmeldebutton sind ohne seitliches Verschieben sichtbar. | Bestanden |
| 375 × 812 px | Login-Karte bleibt innerhalb der Bildschirmbreite. Der Cookie-Hinweis liegt unterhalb der Karte; alle Eingabefelder bleiben erreichbar. | Bestanden |

| Messwert im Viewport 828 × 1792 px | Ergebnis |
|---|---:|
| sichtbare Viewport-Breite | 828 px |
| `documentElement.scrollWidth` | 828 px |
| `body.scrollWidth` | 828 px |
| Login-Karte | x = 224–604 px |
| E-Mail-Feld | x = 252–576 px |
| Passwortfeld | x = 252–576 px |

Damit ist browsergestützt bestätigt, dass weder Dokument noch Body breiter als der Viewport sind und die Login-Karte sowie beide Eingabefelder vollständig im sichtbaren Bereich liegen.

Die Login-Seite verwendet im mobilen Bereich eine feste Viewport-Fläche, begrenzt die Breite auf `100vw`, verhindert horizontalen Überlauf und begrenzt die Karte auf `calc(100vw - 32px)`. Dadurch kann sie weder nach rechts aus dem sichtbaren Bereich ragen noch abgeschnitten werden.

Die Fernsteuerungsleiste der externen Remote-Umgebung gehört nicht zum Portal. Sie kann über dem Bildschirm liegen, erzeugt jedoch nach der Korrektur keinen horizontalen Überlauf der Portaloberfläche.
