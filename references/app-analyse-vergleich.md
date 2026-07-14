# App-Analyse: Lebenswert Betreuung Portal
## Vergleich mit Referenz-App (W&W Therapiezeit Pro) & CRM-Architekt-Anforderungen

**Analysedatum:** 14. Juli 2026  
**Analysebasis:** CRM-Architekt-Prompt (pasted_content.txt) + Referenz-App https://therapieapp-6iaeuwg7.manus.space/dashboard

---

## 1. Aufbau der Referenz-App (W&W Therapiezeit Pro)

Die Referenz-App verwendet folgendes bewährtes Layout-Muster:

### Navigation (Linke Sidebar – dauerhaft sichtbar)
Die Sidebar ist in **4 semantische Sektionen** gegliedert:

| Sektion | Menüpunkte |
|---|---|
| Übersicht | Dashboard, Benachrichtigungen |
| Praxisbetrieb | Terminkalender, Online-Buchungen, Patienten, Dokumente |
| Personal | Mitarbeiter, Zeiterfassung, Urlaubsplanung, Führerschein-Check |
| Compliance & Abrechnung | Arbeitsschutz, KK-Abrechnung, Datenschutz (DSGVO) |

### Dashboard-Aufbau
- **Compliance-Score** prominent oben (100% als grüner Badge)
- **KPI-Kacheln** in einer Reihe: Aktive Mitarbeiter, Patienten, Termine, Abrechnungen, Urlaub, Führerscheine, Prüfungen, Standorte
- **Balkendiagramm** Termine pro Standort
- **Standort-Status-Liste** mit Ampel-Status je Standort

---

## 2. Stärken der Lebenswert-App (was bereits gut ist)

### Funktionsumfang
Die Lebenswert-App übertrifft die Referenz-App in vielen Bereichen deutlich:

| Bereich | Lebenswert | Referenz-App |
|---|---|---|
| Kundenverwaltung | ✅ Vollständig mit Budget §45b/45a/39 | ✅ Patienten |
| Zeiterfassung | ✅ Live-Timer + manuell | ✅ Vorhanden |
| Urlaubsverwaltung | ✅ Antrag + Genehmigung | ✅ Vorhanden |
| Führerschein-Check | ✅ Mit Foto-Upload | ✅ Vorhanden |
| Leistungsnachweise | ✅ Mit PDF + Unterschrift | ❌ Nicht vorhanden |
| Kassenanfragen | ✅ Mit Vollmacht-PDF | ❌ Nicht vorhanden |
| Fahrtenbuch | ✅ Mit Google Maps | ❌ Nicht vorhanden |
| Budget-Ampeln §SGB XI | ✅ §45b/45a/39 | ❌ Nicht vorhanden |
| DSGVO-Cookie-Banner | ✅ Art. 13 DSGVO | ❌ Nicht vorhanden |
| Neukundenaufnahme | ✅ 4-stufiges Formular | ❌ Nicht vorhanden |

---

## 3. Lücken im Vergleich zur Referenz-App

### 3.1 Navigation & Informationsarchitektur

**Problem:** Die aktuelle Navigation der Lebenswert-App ist ein **Bottom-Tab-Menü** (5 Tabs unten) kombiniert mit einem **Admin-Popup-Menü** (⚙️-Icon). Das ist für mobile Nutzung gut, aber für Desktop-Nutzung (PC, Laptop) nicht optimal.

Die Referenz-App hat eine **permanente linke Sidebar** mit gruppierten Sektionen – das ist für professionelle Verwaltungssoftware der Standard.

**Was fehlt:**
- Keine permanente Sidebar-Navigation für Desktop
- Keine semantische Gruppierung der Menüpunkte (z.B. "Personal", "Kunden", "Abrechnung")
- Admin-Funktionen versteckt hinter ⚙️-Icon statt klar sichtbar in der Navigation

### 3.2 Dashboard

**Was fehlt:**
- Kein **Compliance-Score** (Gesamtbewertung der Betriebsqualität)
- Keine **Standort-Übersicht** (falls mehrere Standorte vorhanden)
- Kein **Heute-Kalender-Widget** mit den nächsten Terminen des Tages
- Kein **Schnellzugriff-Bereich** (häufig genutzte Aktionen als Buttons direkt im Dashboard)
- Keine **Aktivitäts-Timeline** (letzte Aktionen aller Mitarbeiter)

### 3.3 Benachrichtigungen
- Die Benachrichtigungs-Inbox existiert, aber es fehlt eine **Echtzeit-Benachrichtigung** wenn ein Mitarbeiter einen Einsatz abschließt
- Kein **Benachrichtigungs-Kanal für Kunden** (z.B. SMS/E-Mail an Kunden bei Terminänderung)

### 3.4 Dokumente-Bereich
- Die Referenz-App hat einen zentralen **Dokumente-Bereich** – bei Lebenswert sind Dokumente auf mehrere Seiten verteilt (Mitarbeiterakte, Kassenanfragen, Neukundenaufnahme)
- Kein **zentrales Dokumenten-Archiv** mit Suchfunktion über alle Dokumente hinweg

### 3.5 Online-Buchungen / Terminkalender
- Die Referenz-App hat **Online-Buchungen** (Kunden buchen selbst Termine)
- Bei Lebenswert gibt es keinen öffentlichen Buchungslink für Kunden

### 3.6 Abrechnung
- Die Referenz-App hat eine **KK-Abrechnung** (Krankenkassen-Abrechnung)
- Bei Lebenswert gibt es DATEV/Lexware-Export, aber keine direkte **elektronische Abrechnung** mit Pflegekassen (OptaData-Schnittstelle fehlt noch)

---

## 4. Empfehlungen nach CRM-Architekt-Prinzipien

### Priorität 1 – Navigation umbauen (Desktop-Sidebar)

**Metapher:** Stell dir vor, dein Büro hat eine Wand mit beschrifteten Schubladen. Momentan sind alle Schubladen in einem Schrank versteckt, den du erst öffnen musst. Die Referenz-App zeigt alle Schubladen direkt an der Wand – du siehst sofort, wo alles ist.

**Lösung:** Permanente linke Sidebar mit 4 Sektionen:
- **Übersicht:** Dashboard, Benachrichtigungen
- **Kunden & Einsätze:** Kundenliste, Einsätze, Kalender, Kassenanfragen
- **Personal:** Mitarbeiter, Zeiterfassung, Urlaub, Krankmeldung, Führerschein, Touren
- **Verwaltung:** Leistungsnachweise, Fahrtenbuch, Export, Logbuch, DSGVO

### Priorität 2 – Dashboard erweitern

**Metapher:** Das Dashboard ist wie die Anzeigentafel in einem Bahnhof – du siehst auf einen Blick, was heute passiert, was dringend ist und was gut läuft.

**Lösung:** Folgende Elemente ergänzen:
- Compliance-Score (berechnet aus: offene Leistungsnachweise, abgelaufene Führerscheine, Budget-Warnungen)
- Heute-Kalender-Widget (nächste 5 Einsätze des Tages)
- Schnellzugriff-Buttons (Neuer Einsatz, Neue Kassenanfrage, Neuer Kunde)
- Aktivitäts-Feed (letzte 10 Aktionen im System)

### Priorität 3 – Zentrales Dokumenten-Archiv

**Metapher:** Momentan liegen deine Dokumente in verschiedenen Zimmern verteilt. Ein zentrales Archiv ist wie ein Aktenschrank im Eingangsbereich – alles an einem Ort, durchsuchbar.

### Priorität 4 – Responsive Desktop-Layout

Die App ist aktuell mobile-first gebaut. Für die Nutzung am Büro-PC fehlt:
- Breitere Tabellen mit mehr Spalten
- Seitenleiste für Detailansichten (kein Full-Screen-Modal)
- Tastaturkürzel für häufige Aktionen

---

## 5. Gesamtbewertung

| Kriterium | Bewertung | Begründung |
|---|---|---|
| Funktionsumfang | ⭐⭐⭐⭐⭐ | Übertrifft die Referenz-App in Pflegebranche-spezifischen Features |
| Navigation (Desktop) | ⭐⭐⭐ | Bottom-Tabs gut für Handy, aber nicht ideal für PC |
| Dashboard | ⭐⭐⭐ | Vorhanden, aber kein Compliance-Score, kein Heute-Widget |
| Design-Qualität | ⭐⭐⭐⭐ | Professionelles Grün-Thema, konsistente Karten |
| DSGVO-Konformität | ⭐⭐⭐⭐⭐ | Cookie-Banner, Art. 13 DSGVO, verschlüsselte Übertragung |
| Mobile-Tauglichkeit | ⭐⭐⭐⭐⭐ | PWA, installierbar, offline-fähig |
| Skalierbarkeit | ⭐⭐⭐⭐ | TiDB-Datenbank, Autoscale-Hosting |

**Gesamtnote: 4,1 / 5** – Sehr gute Basis, die mit einem Desktop-Navigation-Umbau und Dashboard-Erweiterung auf 5/5 gebracht werden kann.
