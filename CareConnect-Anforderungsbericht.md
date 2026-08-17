# CareConnect-Anforderungsbericht

**Projekt:** Seniorenassistenz Bernhardt – Mitarbeiter-Portal  
**Stand:** 17. August 2026  
**Autor:** Manus AI

## Zusammenfassung

Die vier Punkte des CareConnect-Referenztextes wurden mit der tatsächlichen Portalarchitektur abgeglichen und im vorhandenen System umgesetzt beziehungsweise verifiziert. Der Schwerpunkt lag auf der datensparsamen Kundenzuteilung, einer explizit möglichen Wochenendplanung, einer belastbaren Mitteilungsfunktion und einer arbeitsmusterbasierten Urlaubslogik.

> **Wichtige Einordnung:** Der Referenztext beschreibt teilweise eine PostgreSQL-/JWT-/Railway-Architektur. Das reale Portal arbeitet mit React, Express, tRPC und MySQL/TiDB sowie einer eigenen Mitarbeiter-Session. Die Schutzwirkung wurde daher an der tatsächlichen Architektur umgesetzt, nicht an einer hypothetischen Zielarchitektur.

| Anforderung | Ergebnis | Abnahmestatus |
|---|---|---|
| Kundenzuteilung mit Name, Adresse, Pflegegrad und Paragraphen | Auswahl und Detaildarstellung ergänzt; Pflegegrad nur im zugewiesenen Mitarbeiter-/Admin-Kontext | Erfüllt |
| Planung an Samstag und Sonntag | Alle sieben Kalendertage sind planbar; Wochenende wird automatisch gekennzeichnet | Erfüllt |
| Mitteilungen mit Lesebestätigung | Listen-, Bestätigungs-, Admin- und Löschabläufe bereinigt; Fortschritt wird im Adminbereich geliefert | Erfüllt |
| Proportionaler Urlaub nach konkreten Arbeitstagen | Arbeitsmuster, Historie, Feiertagsausnahme, Eintritts- und Wechselberechnung ergänzt | Erfüllt mit fachlichem Prüfhinweis |

## 1. Kundenzuteilung und Schutz des Pflegegrads

Die Kundenauswahl im Terminassistenten zeigt jetzt statt einer reinen Kennung den vollständigen Namen, die Anschrift und die abrechnungsrelevanten SGB-XI-Paragraphen. Der Pflegegrad wird nur für administrativ Berechtigte oder für Beschäftigte ausgegeben, denen der Kunde aktiv zugeteilt ist. Die Serverlogik prüft die Kundenzuteilung zudem vor dem Anlegen eines eigenen Termins erneut. Das ist wichtig, weil eine bloße Ausblendung im Browser keinen ausreichenden Schutz bieten würde.

| Schutzschicht | Umsetzung | Risiko, das abgefangen wird |
|---|---|---|
| Datenminimierung | Eigene Planung erhält nur zugeteilte Kunden | Unnötige Einsicht in Kundendaten |
| Gesundheitsdaten | Pflegegrad nur bei Zuteilung oder Administration | Zugriff auf besondere personenbezogene Daten außerhalb der Aufgabe |
| Serverseitige Prüfung | Fremde Kundenzuteilung beim Speichern wird abgewiesen | Manipulierte Browseranfrage |
| Transparente Auswahl | Adresse und Paragraphen sind im Auswahlfeld sichtbar | Fehlplanung durch unklare Kundennummern |

Der Pflegegrad ist im konkreten Kontext ein besonders schutzwürdiges Datum. Die technische Beschränkung folgt deshalb dem Prinzip der Erforderlichkeit und nicht lediglich einer optischen Rollenanzeige.

## 2. Wochenendplanung

Samstag und Sonntag sind sowohl in der Wochenansicht als auch im Planungsdialog zulässige Tage. Bei einem Einsatz an einem Wochenende wird ein separates Kennzeichen gespeichert. Das Kennzeichen unterstützt später Auswertungen zu Ausnahme- oder Zuschlagsfällen, ohne die normale Planungsfreiheit einzuschränken.

Die Datenbank enthält die Kennzeichnung `wochenendeinsatz`. Die Migrationsprüfung bestätigte die vorhandene Spalte; bereits vorhandene Wochenendtermine wurden bei der Migration erkannt. Eine feste Sperrregel für Samstag oder Sonntag besteht nicht mehr.

## 3. Mitteilungen und Lesebestätigung

Der Mitarbeiterbereich verwendet den echten Mitteilungsvertrag mit `typ` und `pflichtBestaetigung`. Der Server stellt sowohl `mitteilungen.liste` als auch den Kompatibilitätsalias `mitteilungen.list` bereit. Eine Lesebestätigung wird nur noch für eine aktive Mitteilung gespeichert. Der Adminbereich erhält je Mitteilung die Gesamtzahl aktiver Mitarbeiter und die Zahl der eingegangenen Bestätigungen.

| Teilprozess | Verhalten nach Umsetzung |
|---|---|
| Freigabe durch Administration | Mitteilung wird als aktiv gespeichert und im Mitarbeiterbereich gelistet |
| Anzeige beim Mitarbeiter | Pflichtmitteilungen können bestätigt werden; freiwillige Meldungen bleiben lesbar |
| Lesebestätigung | Doppelbestätigungen werden sicher ignoriert |
| Ablauf/Deaktivierung | Inaktive Meldungen können nicht mehr neu bestätigt werden |
| Admin-Übersicht | Fortschritt je Mitteilung kann über Bestätigte/Gesamt verfolgt werden |

## 4. Urlaub nach individuellen Arbeitstagen

### Fachliche Logik

Jeder Mitarbeiter erhält ein konkretes Wochenmuster, beispielsweise `Mo, Mi, Fr`. Urlaub wird nicht mehr nach Kalendertagen und nicht nach Wochenstunden abgezogen, sondern nur für planmäßige Arbeitstage. Eine Teilzeitkraft mit drei festen Tagen pro Woche verbraucht für eine volle Kalenderwoche daher drei, nicht fünf Urlaubstage.

Als gesetzlicher Richtwert werden je Wochenarbeitstag vier Urlaubstage pro Jahr berechnet. Das entspricht bei fünf Arbeitstagen 20 Tagen, bei drei Tagen 12 Tagen. Höhere vertraglich vereinbarte Ansprüche bleiben erhalten; das Portal verwendet den für den Mitarbeiter günstigeren Wert.

| Sonderfall | Technische Behandlung |
|---|---|
| Drei-Tage-Woche | Nur die hinterlegten drei Wochentage werden gezählt |
| Samstags-/Sonntagsarbeit | Wochenendtage können Teil des Arbeitsmusters sein und werden dann gezählt |
| Gesetzlicher Feiertag am Arbeitstag | Wird im Portalmodell nicht als Urlaubstag abgezogen |
| Eintritt im laufenden Jahr | Gesetzlicher Mindestanspruch wird zeitanteilig ermittelt |
| Wechsel des Wochenmusters im Jahr | Historie mit „gültig ab/bis“ bestimmt die jeweils relevanten Arbeitstage |
| Genehmigung/Rücknahme | Verbrauchtes Urlaubskonto wird bei Statuswechsel automatisch belastet bzw. entlastet |

Die Arbeitsmusterhistorie verhindert, dass ein späteres neues Teilzeitmodell rückwirkend den Verbrauch aus einer früheren Vertragsphase verändert. Der Admin kann das Muster in der zentralen Mitarbeiterverwaltung sowie in der Mitarbeiterakte pflegen.

## 5. Datenmigration und Testbefunde

Die Tabellenabsicherung hat die Spalte für das Wochenmuster sowie die revisionsfähige Historientabelle erstellt. Für die 12 aktiven Mitarbeiter ist ein Arbeitsmuster und jeweils ein erster Historieneintrag vorhanden. Zum Zeitpunkt der Migration lagen keine genehmigten Urlaubsanträge vor. Daher war keine rückwirkende Korrekturbuchung eines bestehenden Urlaubskontos erforderlich.

| Prüfung | Ergebnis |
|---|---|
| TypeScript | Erfolgreich ohne Fehler |
| Automatisierte Tests | 19 Testdateien, 130 Tests erfolgreich |
| Urlaubslogik | Tests für Drei-Tage-Woche, Feiertag, Wochenendarbeit, Wechsel im Jahr und Eintritt im Jahr erfolgreich |
| Kundenzuteilung | Regressionstest sichert serverseitige Fremdzuteilungs-Sperre |
| Mitteilungen | Regressionstest sichert verwendete API-Felder und Admin-Endpunkte |
| Öffentliche Anmeldung | Browseransicht ohne technische Fehlermeldung geprüft |

### 5.1 Bestandsabgleich der Urlaubskonten

Der Abgleich wurde am 17. August 2026 für alle **12 aktiven Mitarbeiterkonten** ausgeführt. Er vergleicht pro Konto die gebuchten Urlaubstage mit der Summe der nicht gelöschten, genehmigten Urlaubsanträge. Das Ergebnis ist eindeutig: **12 von 12 Konten sind stimmig**, die Summe genehmigter Antragstage beträgt 0 und die Summe gebuchter Urlaubstage beträgt ebenfalls 0. Eine rückwirkende Umbuchung war deshalb nicht erforderlich.

Die Abfrage bleibt als fachliches Prüfmuster dokumentiert: `urlaubstageVerbraucht = SUM(genehmigte, nicht gelöschte Antragstage)`. Bei künftigen Abweichungen darf keine automatische Korrektur ohne administrative Prüfung erfolgen.

### 5.2 Prüffähige Akzeptanzkriterien

| ID | Akzeptanzkriterium | Nachweis |
|---|---|---|
| AK-01 | Ein zugeteilter Mitarbeiter sieht in der Terminplanung Kundenname, Anschrift, Pflegegrad und abrechnungsrelevante Paragraphen. | Auswahlfeld und serverseitiger Zuteilungsfilter |
| AK-02 | Ein nicht zugeteilter Mitarbeiter kann weder Pflegegrad einsehen noch einen eigenen Termin für diesen Kunden speichern. | Rollenfilter und Regressionstest für die Fremdzuteilungs-Sperre |
| AK-03 | Ein Einsatz kann an jedem der sieben Wochentage gespeichert werden; Samstag/Sonntag werden als Wochenendeinsatz markiert. | Wochenansicht, Planungsdialog und Datenbankspalte `wochenendeinsatz` |
| AK-04 | Eine aktive Pflichtmitteilung kann einmal bestätigt werden; der Admin erhält Bestätigte/Gesamt. | Mitteilungsrouter, eindeutige Lesebestätigung und Adminfortschritt |
| AK-05 | Ein Urlaubsantrag zählt nur planmäßige Arbeitstage und nimmt gesetzliche Feiertage aus. | Servervorschau und 7 Urlaubslogik-Tests |
| AK-06 | Ein Wechsel des Wochenmusters wirkt ab seinem Gültigkeitsdatum und verändert frühere Zeiträume nicht. | Historientabelle `mitarbeiterArbeitsmuster` und Regressionstest |
| AK-07 | Eintritt im laufenden Jahr führt zu einer zeitanteiligen Mindestanspruchsberechnung; vertraglich höhere Werte bleiben erhalten. | Pro-rata-Funktion und Regressionstest |

## 6. DSGVO- und RBAC-Bewertung

Die neue Kundendatenanzeige folgt dem Prinzip der Datenminimierung: Für eine Terminplanung werden Name und Anschrift benötigt; der Pflegegrad wird technisch nur im Aufgabenkontext einer aktiven Zuordnung ausgeliefert. Die Berechtigungsentscheidung geschieht serverseitig. Dadurch hängt der Schutz nicht davon ab, ob ein Menüpunkt im Browser ausgeblendet wird.

Es bleiben organisatorische Aufgaben: Zuteilungen müssen beim Austritt, bei Urlaubsvertretungen und bei Rollenwechseln zeitnah gepflegt werden. Außerdem ist die rechtsverbindliche Arbeitsvertrags- und Tarifprüfung der individuellen Urlaubsansprüche Sache der Geschäftsführung beziehungsweise einer arbeitsrechtlichen Beratung.

## 7. Pre-Mortem und präventive Maßnahmen

| Mögliche Fehlerursache | Frühes Warnsignal | Prävention |
|---|---|---|
| Arbeitsmuster wird nicht bei Vertragsänderung gepflegt | Urlaubsvorschau wirkt unplausibel | Muster im selben Arbeitsschritt wie Beschäftigungsumfang ändern und Gültigkeitsdatum dokumentieren |
| Regionaler Feiertag fehlt in der zentralen Feiertagslogik | Unterschied zwischen Dienstplan und Urlaubsvorschau | Bundesland-/Standortregel vor Produktivnutzung fachlich festlegen |
| Kunde wird nicht rechtzeitig entzogen | Mitarbeiter sieht weiterhin Kundendaten | Zuteilung beim Wechsel der Betreuungskraft am selben Tag deaktivieren |
| Pflichtmitteilung bleibt unbemerkt | Bestätigungsquote stagniert | Admin-Fortschritt regelmäßig prüfen und Reminder-Prozess verwenden |
| Historische Altanträge weichen von der neuen Logik ab | Differenz zwischen Konto und Antragssumme | Vor einer rückwirkenden Umbuchung einzelne Altfälle fachlich freigeben lassen |

## 8. Aufwand und nächste fachliche Entscheidung

| Maßnahme | Aufwand | Empfehlung |
|---|---|---|
| Bundeslandabhängige Feiertagsverwaltung | M | Vor dem ersten produktiven Urlaubsjahr festlegen |
| Bericht über ausstehende Lesebestätigungen mit Erinnerung | S | Sinnvoll für verbindliche Mitarbeiterinformationen |
| CSV-/Excel-Export der Arbeitsmuster- und Urlaubshistorie | S | Sinnvoll für Personalakte und Prüfung |
| Rückwirkende Korrektur alter genehmigter Urlaube | M–L | Nur nach fachlicher Einzelfallprüfung |

## 9. Fernsteuerungsprüfung – technische Abgrenzung

Der Produktionsaufruf `https://portal.lebenswert-betreuung.de/` wurde erneut auf die sichtbare Seniorenassistenz-Bernhardt-Anmeldeseite geprüft. Die Anmeldemaske enthält E-Mail-, Passwort-, Sichtbarkeits- und Anmeldeelemente und leitet nicht zu einer externen OAuth-Anmeldung um.

Die Schaltfläche **„Übernehmen Sie die Kontrolle“** gehört nicht zum Portalcode, sondern zur Browser-/Fernsteuerungsumgebung der Plattform. Der persönliche Browser-Connector ist in der Sitzung aktiviert; die automatisierte Prüfung kann jedoch keine Bedienhandlung in einem privaten Benutzerbrowser erzwingen oder dessen Werkzeugleiste auslesen. Es gibt daher keinen zusätzlichen Portalcode, der für diese externe Leiste geändert werden müsste. Der fachliche Zielpfad nach einer Übernahme ist die oben geprüfte öffentliche Mitarbeiter-Anmeldung.

**End-to-End-Bestätigung:** Die Auslösung von „Übernehmen Sie die Kontrolle“ im verbundenen persönlichen Browser wurde anschließend durch den Nutzer bestätigt. Der konkrete Zielpfad endet auf der sichtbaren Mitarbeiter-Anmeldeseite. Damit ist der externe Fernsteuerungsnachweis abgeschlossen.

## Referenzen

Die technischen Quellen- und Rechtsnotiz ist im Projekt unter `references/careconnect_rechtsgrundlagen.md` hinterlegt.

[1]: https://www.ihk.de/nordschwarzwald/recht/recht/arbeitsrecht/merkbl/urlaub-2619398 "IHK Nordschwarzwald – Berechnung von Urlaub bei Teilzeit"
[2]: https://www.bundesarbeitsgericht.de/entscheidung/9-azr-430-11/ "Bundesarbeitsgericht, 9 AZR 430/11"
[3]: https://www.gesetze-im-internet.de/burlg/__3.html "Bundesurlaubsgesetz § 3"
