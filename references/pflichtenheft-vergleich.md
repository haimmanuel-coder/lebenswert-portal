# Pflichtenheft-Vergleich: PflegeManager Pro vs. Lebenswert Betreuung – Mitarbeiter-Portal

**Stand:** 29. Juni 2026 | **Grundlage:** PflegeManagerPro.pdf (14 Seiten, Version 1.0)

---

## Zusammenfassung

Das Pflichtenheft beschreibt eine vollständig digitalisierte, DSGVO-konforme Cloud-Plattform für ambulante Pflege- und Betreuungsleistungen gemäß §§ 39, 45a und 45b SGB XI. Der aktuelle Projektstand deckt die Kernprozesse des Tagesgeschäfts gut ab, weist jedoch in den Bereichen Personalverwaltung, Tourenplanung, Drittanbieter-Schnittstellen, Sicherheit und Geschäftsregeln noch erhebliche Lücken auf.

Von den 14 Hauptkapiteln des Pflichtenhefts sind **7 vollständig oder weitgehend umgesetzt**, **5 teilweise umgesetzt** und **2 noch nicht begonnen**.

---

## Übersichtstabelle: Implementierungsstand je Pflichtenheft-Kapitel

| # | Kapitel | Status | Kurzkommentar |
|---|---------|--------|---------------|
| 1 | Projektübersicht / Kernprozesse | ⚠️ Teilweise | 9 von 13 Prozessen implementiert |
| 2 | Technische Architektur | ⚠️ Teilweise | React/TS/PWA ✅ – Next.js, NestJS, Redis ❌ |
| 3 | Benutzerrollenmatrix | ⚠️ Teilweise | Nur 2 Rollen (Admin/Mitarbeiter) statt 4 |
| 4 | Datenbankstruktur | ✅ Weitgehend | Kernstruktur vorhanden, einige Felder fehlen |
| 5 | Budgetberechnung | ✅ Vorhanden | Stundensätze und Restbudget-Logik implementiert |
| 6 | Geschäftsregeln | ❌ Nicht umgesetzt | Mindestdauer, Doppelbelegung, Budget-Sperre fehlen |
| 7 | API-Konzept | ⚠️ Teilweise | JWT ✅ – OAuth 2.0, Refresh Token, 2FA ❌ |
| 8 | Externe Schnittstellen | ⚠️ Teilweise | Google Maps ✅ – OptaData, Lexware, DATEV ❌ |
| 9 | Workflow Leistungsnachweise | ⚠️ Teilweise | Erstellen ✅ – Admin-Prüfung/Freigabe-UI ❌ |
| 10 | Benachrichtigungssystem | ⚠️ Teilweise | Push ✅ – E-Mail-Kanal, In-App-Inbox ❌ |
| 11 | Datenschutz | ✅ Weitgehend | SSL, JWT, Audit-Log ✅ – AES-256, 2FA ❌ |
| 12 | UI/UX Designvorgaben | ⚠️ Teilweise | Dashboard ✅ – Tourenplanung-UI, Wochenansicht ❌ |
| 13 | Automatisierungen | ❌ Nicht umgesetzt | Alle Freigabe-Automatisierungen fehlen |
| 14 | Zukünftige Erweiterungen | ✅ Teilweise vorweggenommen | Digitale Unterschrift bereits implementiert |

---

## Detailanalyse: Nicht implementierte Funktionen

### 1. Urlaubsverwaltung

Das Pflichtenheft fordert ein vollständiges Modul zur Verwaltung von Mitarbeiterurlauben, inklusive Antragstellung, Genehmigung durch die Teamleitung und Anzeige im Benachrichtigungssystem (Ereignis: „Urlaub beantragt"). Im aktuellen Projekt existiert weder eine Datenbanktabelle noch eine UI-Seite für Urlaubsanträge. Mitarbeiter können keinen Urlaub beantragen, und Admins haben keine Übersicht über geplante Abwesenheiten.

### 2. Krankmeldungs-Modul

Analog zur Urlaubsverwaltung verlangt das Pflichtenheft ein Krankmeldungs-Modul mit eigenem Benachrichtigungs-Ereignis. Auch hier fehlen Datenbanktabelle, Backend-Route und Frontend-Seite vollständig. Die Abwesenheitsplanung für erkrankte Mitarbeiter ist damit nicht digital abbildbar.

### 3. Tourenplanung mit Drag & Drop

Das Pflichtenheft spezifiziert eine vollständige Tourenplanung mit Drag-&-Drop-Oberfläche, Kalenderansicht (Woche, Monat), Kartenansicht sowie der Möglichkeit, Touren für Mitarbeiter zu planen und zuzuweisen. Der aktuelle Kalender zeigt lediglich bereits erfasste Einsätze in einer Monatsansicht an. Eine Wochenansicht, eine Kartenansicht, Drag & Drop sowie die aktive Planung neuer Touren durch Teamleitung oder Admin fehlen vollständig.

> „Tourenplanung: Drag & Drop, Kalenderansicht, Wochenansicht, Monatsansicht, Kartendarstellung." — Pflichtenheft, Kapitel 12

### 4. Benutzerrolle „Teamleitung" und „Buchhaltung"

Das Pflichtenheft definiert vier Rollen: Admin, Teamleitung, Mitarbeiter und Buchhaltung. Im aktuellen Schema sind nur zwei Rollen implementiert: `admin` und `mitarbeiter`. Die Teamleitung soll u. a. Kunden anlegen und bearbeiten, Touren planen, Leistungsnachweise prüfen und Budget bearbeiten dürfen. Die Buchhaltung soll Abrechnungen exportieren können. Beide Rollen fehlen komplett, was bedeutet, dass die gesamte Rechte-Granularität laut Pflichtenheft nicht abgebildet ist.

| Funktion | Admin | Teamleitung | Mitarbeiter | Buchhaltung |
|----------|-------|-------------|-------------|-------------|
| Kunden anlegen | ✅ | ❌ fehlt | — | — |
| Touren planen | ✅ | ❌ fehlt | — | — |
| Andere Touren sehen | ✅ | ❌ fehlt | — | — |
| Leistungsnachweise prüfen | ✅ | ❌ fehlt | — | — |
| Budget bearbeiten | ✅ | ❌ fehlt | — | — |
| Abrechnung exportieren | ✅ | — | — | ❌ fehlt |

### 5. Admin-Freigabe-Workflow für Leistungsnachweise (UI-Seite)

Der Workflow laut Pflichtenheft sieht vier Schritte vor: Mitarbeiter beendet Einsatz → Leistungsnachweis wird erzeugt → **Admin prüft** → **Admin gibt frei**. Die Datenbankstruktur unterstützt die Status-Werte `pruefung` und `freigegeben` bereits. Jedoch fehlt im Frontend eine dedizierte Prüf- und Freigabe-Oberfläche für Admins, in der alle eingereichten Leistungsnachweise gelistet, geprüft und freigegeben werden können. Mitarbeiter erhalten auch keine Rückmeldung, wenn ein Nachweis abgelehnt wird.

### 6. Geschäftsregel: Mindestdauer 1,5 Stunden

Das Pflichtenheft schreibt vor: „Jeder Einsatz: ≥ 1,5 Stunden. Speichern unterhalb dieser Grenze nicht zulässig." Im Backend ist lediglich eine Mindestvalidierung von `min(0.5)` für `dauerStunden` vorhanden. Eine Prüfung auf 1,5 Stunden (90 Minuten) als Mindestdauer fehlt sowohl im Backend als auch im Frontend.

### 7. Geschäftsregel: Automatische Doppelbelegungsprüfung

Das Pflichtenheft fordert, dass das System automatisch prüft, ob ein Mitarbeiter oder ein Kunde zum gleichen Zeitpunkt bereits einen anderen Termin hat. Diese Prüfung fehlt vollständig. Es ist derzeit möglich, zwei Einsätze für denselben Mitarbeiter oder Kunden zur gleichen Zeit anzulegen.

### 8. Geschäftsregel: Budgetüberschreitung blockiert Terminanlage

Laut Pflichtenheft soll das System die Anlage oder Änderung eines Termins verhindern, wenn dadurch das Budget des Kunden überschritten wird. Eine Ausnahme ist nur per Admin-Freigabe möglich. Aktuell gibt es zwar Budget-Warnungen (Push-Benachrichtigung bei < 10 %), aber keine harte Sperre bei Budgetüberschreitung.

### 9. 2-Faktor-Authentifizierung (2FA)

Das Pflichtenheft fordert 2FA als Sicherheitsmaßnahme. Die aktuelle Implementierung verwendet ausschließlich E-Mail + Passwort ohne zweiten Faktor. Weder TOTP (z. B. Google Authenticator) noch SMS-basierte 2FA sind implementiert.

### 10. Refresh Token

Das API-Konzept sieht neben dem JWT-Access-Token auch einen Refresh Token vor, der eine sichere Token-Erneuerung ohne erneutes Login ermöglicht. Aktuell wird nur ein einzelner JWT mit 30 Tagen Laufzeit verwendet. Ein dedizierter Refresh-Token-Mechanismus fehlt.

### 11. E-Mail-Benachrichtigungskanal

Das Benachrichtigungssystem soll drei Kanäle bedienen: Push, **E-Mail** und **In-App**. Push-Benachrichtigungen sind implementiert. E-Mail-Versand (z. B. bei Terminänderungen, Urlaubsanträgen, Budget-Überschreitungen) fehlt vollständig. Es gibt kein E-Mail-Integration (z. B. via SMTP/Nodemailer oder einem E-Mail-Dienst).

### 12. In-App-Benachrichtigungs-Inbox

Eine In-App-Inbox, in der Mitarbeiter ihre Benachrichtigungen lesen und als „gelesen" markieren können, fehlt. Die Datenbanktabelle `notifications` ist im Pflichtenheft mit den Feldern `empfaenger`, `titel`, `nachricht`, `gelesen`, `datum` spezifiziert. Diese Tabelle existiert im aktuellen Schema nicht, und es gibt keine UI-Komponente für eine Benachrichtigungs-Liste.

### 13. OptaData-Schnittstelle

Das Pflichtenheft fordert eine Schnittstelle zu OptaData für den automatisierten Datenaustausch von Kunden, Leistungen und Abrechnungen über REST API oder HL7/FHIR. Diese Schnittstelle ist nicht implementiert.

### 14. Lexware-Export

Ein automatisierter Export von Rechnungen, Mitarbeiterkosten und Kilometerkosten im Lexware-Format ist nicht vorhanden. Der aktuelle CSV-Export ist ein allgemeiner Massen-Export ohne Lexware-Kompatibilität.

### 15. DATEV-Export

Das Pflichtenheft fordert einen DATEV-kompatiblen Export für Lohnabrechnung, Kilometerabrechnung und Buchhaltung. Dieser fehlt vollständig. DATEV hat ein spezifisches Dateiformat (DATEV-Buchungsstapel, ASCII-Format), das nicht mit dem aktuellen CSV-Export kompatibel ist.

### 16. Steuerbürokommunikation

Als eigenständiger Prozess im Projektziel genannt, aber nicht als eigenes Modul implementiert. Der DATEV-Export wäre der technische Kern dieses Prozesses.

### 17. Automatisierungen mit Admin-Freigabepflicht

Kapitel 13 des Pflichtenhefts definiert, dass folgende Aktionen eine explizite Admin-Freigabe erfordern, bevor sie automatisch ausgeführt werden: E-Mail-Versand, Pflegekassenübermittlung, Steuerbüroexport, Lexwareexport und OptaDataexport. Diese Freigabe-Mechanismen sind nicht implementiert, da die zugrundeliegenden Schnittstellen selbst noch fehlen.

### 18. Profil-Seite für Mitarbeiter (Mobile Navigation)

Das Pflichtenheft spezifiziert für die Mobile App eine Bottom Navigation mit den Punkten: Dashboard, **Touren**, Kunden, Fahrtenbuch und **Profil**. Eine eigene Profil-Seite, auf der Mitarbeiter ihre persönlichen Daten einsehen und bearbeiten können (Telefon, Passwort, Benachrichtigungseinstellungen), fehlt. Der aktuelle Logout-Button in der TopBar ist kein Ersatz für eine vollwertige Profil-Seite.

---

## Zusammenfassung nach Priorität

Die folgende Tabelle ordnet die fehlenden Funktionen nach ihrer Bedeutung für den Betrieb:

| Priorität | Fehlende Funktion | Aufwand (geschätzt) |
|-----------|-------------------|---------------------|
| 🔴 Hoch | Tourenplanung (Woche, Drag & Drop, Karte) | Groß (5–8 Tage) |
| 🔴 Hoch | Urlaubsverwaltung + Krankmeldung | Mittel (2–3 Tage) |
| 🔴 Hoch | Leistungsnachweis-Freigabe-UI für Admin | Klein (1 Tag) |
| 🔴 Hoch | Doppelbelegungsprüfung (Backend) | Klein (0,5 Tage) |
| 🟡 Mittel | Rollen Teamleitung + Buchhaltung | Mittel (2–3 Tage) |
| 🟡 Mittel | Mindestdauer-Regel 1,5h + Budget-Sperre | Klein (0,5 Tage) |
| 🟡 Mittel | In-App-Benachrichtigungs-Inbox | Klein (1 Tag) |
| 🟡 Mittel | E-Mail-Benachrichtigungskanal | Mittel (1–2 Tage) |
| 🟡 Mittel | Profil-Seite (Mitarbeiter) | Klein (1 Tag) |
| 🟠 Niedrig | DATEV-Export | Mittel (2 Tage) |
| 🟠 Niedrig | Lexware-Export | Mittel (2 Tage) |
| 🟠 Niedrig | 2-Faktor-Authentifizierung | Mittel (1–2 Tage) |
| 🟠 Niedrig | Refresh Token | Klein (0,5 Tage) |
| 🔵 Extern | OptaData-Schnittstelle | Groß (3–5 Tage) |
| 🔵 Extern | Steuerbürokommunikation | Groß (abhängig von DATEV) |

---

## Was bereits gut implementiert ist

Zum Abschluss sei festgehalten, dass die App in den folgenden Bereichen den Pflichtenheft-Anforderungen vollständig oder sehr gut entspricht:

Das **Kerngeschäft** – Einsätze erfassen und abschließen, Leistungsnachweise erstellen und einreichen, Fahrtenbuch führen und Kundendaten verwalten – ist solide und mobil-optimiert umgesetzt. Die **Budgetkontrolle** mit automatischer Restbudget-Berechnung, Warnungen bei < 10 % und dem Pflegegrad-Rechner geht teilweise über das Pflichtenheft hinaus. Das **PWA-Konzept** mit Offline-Modus, Service Worker, IndexedDB-Queue und Push-Benachrichtigungen entspricht den technischen Anforderungen. Das **Führerschein-Kontrollmodul**, die **Neukundenaufnahme** mit Vollmacht-PDF und das **Kassenanfrage-Modul** sind Eigenentwicklungen, die im Pflichtenheft nicht explizit gefordert, aber für den Betrieb wertvoll sind. Das **Audit-Log** und die **Rollentrennung Admin/Mitarbeiter** erfüllen die Grundanforderungen des Datenschutzkapitels.
