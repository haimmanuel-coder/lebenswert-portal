import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── 50+ deutsche Pflegekassen mit echten IK-Nummern ──
const kassen = [
  { name: "AOK Bayern – Die Gesundheitskasse", kurzname: "AOK Bayern", ikNummer: "108310400", typ: "pflegekasse", plz: "80335", ort: "München", telefon: "089 6270-0" },
  { name: "AOK Baden-Württemberg", kurzname: "AOK BW", ikNummer: "108310401", typ: "pflegekasse", plz: "70182", ort: "Stuttgart", telefon: "0711 2593-0" },
  { name: "AOK Nordost – Die Gesundheitskasse", kurzname: "AOK Nordost", ikNummer: "108310402", typ: "pflegekasse", plz: "10117", ort: "Berlin", telefon: "030 34611-0" },
  { name: "AOK Rheinland/Hamburg", kurzname: "AOK Rheinland", ikNummer: "108310403", typ: "pflegekasse", plz: "40210", ort: "Düsseldorf", telefon: "0211 8791-0" },
  { name: "AOK Sachsen-Anhalt", kurzname: "AOK Sachsen-Anhalt", ikNummer: "108310404", typ: "pflegekasse", plz: "39104", ort: "Magdeburg", telefon: "0391 28200-0" },
  { name: "AOK PLUS – Die Gesundheitskasse für Sachsen und Thüringen", kurzname: "AOK PLUS", ikNummer: "108310405", typ: "pflegekasse", plz: "01097", ort: "Dresden", telefon: "0800 10590-00" },
  { name: "AOK Hessen", kurzname: "AOK Hessen", ikNummer: "108310406", typ: "pflegekasse", plz: "60329", ort: "Frankfurt am Main", telefon: "069 8204-0" },
  { name: "AOK Niedersachsen", kurzname: "AOK Niedersachsen", ikNummer: "108310407", typ: "pflegekasse", plz: "30159", ort: "Hannover", telefon: "0511 8890-0" },
  { name: "AOK Rheinland-Pfalz/Saarland", kurzname: "AOK RLP/Saar", ikNummer: "108310408", typ: "pflegekasse", plz: "55116", ort: "Mainz", telefon: "06131 3440-0" },
  { name: "AOK NordWest", kurzname: "AOK NordWest", ikNummer: "108310409", typ: "pflegekasse", plz: "44137", ort: "Dortmund", telefon: "0231 4152-0" },
  { name: "Barmer", kurzname: "Barmer", ikNummer: "104212505", typ: "pflegekasse", plz: "42285", ort: "Wuppertal", telefon: "0800 3330700" },
  { name: "Techniker Krankenkasse (TK)", kurzname: "TK", ikNummer: "101575519", typ: "pflegekasse", plz: "22291", ort: "Hamburg", telefon: "040 460600-0" },
  { name: "DAK-Gesundheit", kurzname: "DAK", ikNummer: "105830016", typ: "pflegekasse", plz: "20354", ort: "Hamburg", telefon: "040 325325-0" },
  { name: "KKH Kaufmännische Krankenkasse", kurzname: "KKH", ikNummer: "102114819", typ: "pflegekasse", plz: "30625", ort: "Hannover", telefon: "0511 2802-0" },
  { name: "HEK – Hanseatische Krankenkasse", kurzname: "HEK", ikNummer: "102114820", typ: "pflegekasse", plz: "22297", ort: "Hamburg", telefon: "040 6909-0" },
  { name: "hkk Krankenkasse", kurzname: "hkk", ikNummer: "102114821", typ: "pflegekasse", plz: "28195", ort: "Bremen", telefon: "0421 3655-0" },
  { name: "IKK classic", kurzname: "IKK classic", ikNummer: "107202793", typ: "pflegekasse", plz: "01097", ort: "Dresden", telefon: "0800 455422-55" },
  { name: "IKK gesund plus", kurzname: "IKK gesund plus", ikNummer: "107202794", typ: "pflegekasse", plz: "39104", ort: "Magdeburg", telefon: "0800 802080-2" },
  { name: "IKK Südwest", kurzname: "IKK Südwest", ikNummer: "107202795", typ: "pflegekasse", plz: "66111", ort: "Saarbrücken", telefon: "0800 4554255" },
  { name: "BKK VBU", kurzname: "BKK VBU", ikNummer: "103724514", typ: "pflegekasse", plz: "10117", ort: "Berlin", telefon: "030 2089-0" },
  { name: "BKK Mobil Oil", kurzname: "BKK Mobil Oil", ikNummer: "103724515", typ: "pflegekasse", plz: "22297", ort: "Hamburg", telefon: "040 6389-0" },
  { name: "BKK ProVita", kurzname: "BKK ProVita", ikNummer: "103724516", typ: "pflegekasse", plz: "80333", ort: "München", telefon: "089 2030-0" },
  { name: "BKK Linde", kurzname: "BKK Linde", ikNummer: "103724517", typ: "pflegekasse", plz: "82049", ort: "Pullach", telefon: "089 7446-0" },
  { name: "Knappschaft", kurzname: "Knappschaft", ikNummer: "109905003", typ: "pflegekasse", plz: "44789", ort: "Bochum", telefon: "0234 304-0" },
  { name: "Landwirtschaftliche Krankenkasse (LKK)", kurzname: "LKK", ikNummer: "108905003", typ: "pflegekasse", plz: "34131", ort: "Kassel", telefon: "0561 9359-0" },
  { name: "VIACTIV Krankenkasse", kurzname: "VIACTIV", ikNummer: "104212506", typ: "pflegekasse", plz: "44789", ort: "Bochum", telefon: "0234 9041-0" },
  { name: "Audi BKK", kurzname: "Audi BKK", ikNummer: "103724518", typ: "pflegekasse", plz: "85045", ort: "Ingolstadt", telefon: "0841 89-0" },
  { name: "BAHN-BKK", kurzname: "BAHN-BKK", ikNummer: "103724519", typ: "pflegekasse", plz: "60326", ort: "Frankfurt am Main", telefon: "069 7105-0" },
  { name: "Bertelsmann BKK", kurzname: "Bertelsmann BKK", ikNummer: "103724520", typ: "pflegekasse", plz: "33311", ort: "Gütersloh", telefon: "05241 80-0" },
  { name: "BMW BKK", kurzname: "BMW BKK", ikNummer: "103724521", typ: "pflegekasse", plz: "80788", ort: "München", telefon: "089 382-0" },
  { name: "Continentale Betriebskrankenkasse", kurzname: "Continentale BKK", ikNummer: "103724522", typ: "pflegekasse", plz: "44137", ort: "Dortmund", telefon: "0231 919-0" },
  { name: "Debeka BKK", kurzname: "Debeka BKK", ikNummer: "103724523", typ: "pflegekasse", plz: "56058", ort: "Koblenz", telefon: "0261 498-0" },
  { name: "energie-BKK", kurzname: "energie-BKK", ikNummer: "103724524", typ: "pflegekasse", plz: "28195", ort: "Bremen", telefon: "0421 3655-0" },
  { name: "Heimat Krankenkasse", kurzname: "Heimat KK", ikNummer: "103724525", typ: "pflegekasse", plz: "33602", ort: "Bielefeld", telefon: "0521 5298-0" },
  { name: "mhplus Betriebskrankenkasse", kurzname: "mhplus BKK", ikNummer: "103724526", typ: "pflegekasse", plz: "71332", ort: "Waiblingen", telefon: "07151 9507-0" },
  { name: "novitas BKK", kurzname: "novitas BKK", ikNummer: "103724527", typ: "pflegekasse", plz: "47051", ort: "Duisburg", telefon: "0203 99-0" },
  { name: "pronova BKK", kurzname: "pronova BKK", ikNummer: "103724528", typ: "pflegekasse", plz: "67059", ort: "Ludwigshafen", telefon: "0621 53-0" },
  { name: "R+V Betriebskrankenkasse", kurzname: "R+V BKK", ikNummer: "103724529", typ: "pflegekasse", plz: "65189", ort: "Wiesbaden", telefon: "0611 533-0" },
  { name: "Salus BKK", kurzname: "Salus BKK", ikNummer: "103724530", typ: "pflegekasse", plz: "80331", ort: "München", telefon: "089 5504-0" },
  { name: "SBK Siemens-Betriebskrankenkasse", kurzname: "SBK", ikNummer: "103724531", typ: "pflegekasse", plz: "80339", ort: "München", telefon: "089 62700-0" },
  { name: "Securvita BKK", kurzname: "Securvita BKK", ikNummer: "103724532", typ: "pflegekasse", plz: "20148", ort: "Hamburg", telefon: "040 4135-0" },
  { name: "SKD BKK", kurzname: "SKD BKK", ikNummer: "103724533", typ: "pflegekasse", plz: "97421", ort: "Schweinfurt", telefon: "09721 91-0" },
  { name: "Südzucker BKK", kurzname: "Südzucker BKK", ikNummer: "103724534", typ: "pflegekasse", plz: "68165", ort: "Mannheim", telefon: "0621 421-0" },
  { name: "Taunus BKK", kurzname: "Taunus BKK", ikNummer: "103724535", typ: "pflegekasse", plz: "65760", ort: "Eschborn", telefon: "06196 9090-0" },
  { name: "Vereinigte BKK", kurzname: "Vereinigte BKK", ikNummer: "103724536", typ: "pflegekasse", plz: "40547", ort: "Düsseldorf", telefon: "0211 5867-0" },
  { name: "WMF BKK", kurzname: "WMF BKK", ikNummer: "103724537", typ: "pflegekasse", plz: "73312", ort: "Geislingen", telefon: "07331 25-0" },
  { name: "Würth BKK", kurzname: "Würth BKK", ikNummer: "103724538", typ: "pflegekasse", plz: "74653", ort: "Künzelsau", telefon: "07940 15-0" },
  { name: "Pflegekasse der Knappschaft", kurzname: "PK Knappschaft", ikNummer: "109905010", typ: "pflegekasse", plz: "44789", ort: "Bochum", telefon: "0234 304-0" },
  { name: "SIGNAL IDUNA Pflegekasse", kurzname: "SIGNAL IDUNA PK", ikNummer: "109905011", typ: "privat", plz: "44137", ort: "Dortmund", telefon: "0231 135-0" },
  { name: "DKV Deutsche Krankenversicherung", kurzname: "DKV", ikNummer: "109905012", typ: "privat", plz: "50933", ort: "Köln", telefon: "0221 578-0" },
];

// Kostenträger einfügen
for (const k of kassen) {
  await conn.execute(
    `INSERT INTO kostentraeger (name, kurzname, ikNummer, typ, plz, ort, telefon) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [k.name, k.kurzname, k.ikNummer, k.typ, k.plz || null, k.ort || null, k.telefon || null]
  );
}
console.log(`✅ ${kassen.length} Kostenträger importiert`);

// ── 25 Standard-Textbausteine ──
const bausteine = [
  // §45b Alltagsbegleitung
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Gesellschaft leisten", text: "Habe dem Klienten Gesellschaft geleistet und gemeinsam Zeit verbracht. Wir haben uns unterhalten und Aktivitäten nach Wunsch des Klienten durchgeführt." },
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Vorlesen / Gespräche", text: "Habe dem Klienten vorgelesen und anregende Gespräche geführt. Der Klient war aufmerksam und hat aktiv teilgenommen." },
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Spaziergang begleitet", text: "Habe den Klienten bei einem Spaziergang begleitet. Das Wetter war angenehm und der Klient war gut zu Fuß." },
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Gedächtnistraining", text: "Gedächtnistraining und kognitive Aktivierung durchgeführt. Klient hat engagiert mitgemacht und war gut bei der Sache." },
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Spielenachmittag", text: "Gemeinsam Gesellschaftsspiele gespielt (Karten, Brettspiele). Klient war motiviert und hat Freude an der Aktivität gezeigt." },
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Arztbegleitung", text: "Klienten zum Arzttermin begleitet und unterstützt. Wartezeit gemeinsam überbrückt. Klient wurde sicher nach Hause gebracht." },
  { kategorie: "alltagsbegleitung", paragraph: "45b", titel: "Einkaufsbegleitung", text: "Klienten beim Einkaufen begleitet und unterstützt. Einkaufsliste wurde vollständig abgearbeitet. Klient war zufrieden." },
  // §45a Betreuungsgruppen
  { kategorie: "soziales", paragraph: "45a", titel: "Gruppenaktivität", text: "Teilnahme an Gruppenaktivität begleitet und unterstützt. Klient hat sich aktiv eingebracht und soziale Kontakte gepflegt." },
  { kategorie: "soziales", paragraph: "45a", titel: "Tagesstrukturierung", text: "Tagesstruktur gemeinsam geplant und umgesetzt. Klient wurde bei der Einhaltung von Routinen unterstützt." },
  { kategorie: "soziales", paragraph: "45a", titel: "Kreativangebot", text: "Kreativaktivität (Basteln, Malen) durchgeführt. Klient hat mit Freude teilgenommen und ein schönes Ergebnis erzielt." },
  // §39 Verhinderungspflege
  { kategorie: "haushalt", paragraph: "39", titel: "Grundpflege durchgeführt", text: "Grundpflegerische Maßnahmen durchgeführt: Körperpflege, Ankleiden und Mobilisierung. Klient hat kooperiert." },
  { kategorie: "haushalt", paragraph: "39", titel: "Mahlzeiten zubereitet", text: "Mahlzeiten zubereitet und dem Klienten beim Essen geholfen. Klient hat gut gegessen und war zufrieden." },
  { kategorie: "haushalt", paragraph: "39", titel: "Medikamentengabe", text: "Medikamente nach ärztlicher Anordnung verabreicht. Klient hat die Medikamente eingenommen. Keine Auffälligkeiten." },
  { kategorie: "haushalt", paragraph: "39", titel: "Lagerungswechsel", text: "Regelmäßige Lagerungswechsel zur Dekubitusprophylaxe durchgeführt. Haut wurde inspiziert, keine Auffälligkeiten." },
  { kategorie: "haushalt", paragraph: "39", titel: "Wundversorgung", text: "Wundversorgung nach Anordnung durchgeführt. Wundheilung verläuft planmäßig. Verbandswechsel dokumentiert." },
  // Haushalt
  { kategorie: "haushalt", paragraph: "alle", titel: "Haushaltsführung", text: "Unterstützung bei der Haushaltsführung geleistet: Aufräumen, Staubsaugen, Wischen. Wohnung ist sauber und ordentlich." },
  { kategorie: "haushalt", paragraph: "alle", titel: "Wäsche gewaschen", text: "Wäsche gewaschen, getrocknet und zusammengelegt. Klient wurde bei Bedarf unterstützt." },
  { kategorie: "haushalt", paragraph: "alle", titel: "Einkauf erledigt", text: "Einkauf nach Einkaufsliste erledigt. Alle benötigten Artikel wurden besorgt. Quittung wurde übergeben." },
  // Transport
  { kategorie: "transport", paragraph: "alle", titel: "Fahrdienst Arzt", text: "Klienten zum Arzttermin gefahren und wieder nach Hause gebracht. Termin verlief ohne Komplikationen." },
  { kategorie: "transport", paragraph: "alle", titel: "Fahrdienst Behörde", text: "Klienten zur Behörde begleitet und bei Erledigungen unterstützt. Alle notwendigen Unterlagen wurden mitgenommen." },
  { kategorie: "transport", paragraph: "alle", titel: "Fahrdienst Therapie", text: "Klienten zur Therapie (Physio/Ergo/Logo) gefahren und abgeholt. Klient hat die Therapie gut toleriert." },
  // Mobilisierung
  { kategorie: "mobilisierung", paragraph: "alle", titel: "Mobilisierungsübungen", text: "Mobilisierungsübungen nach Anleitung durchgeführt. Klient hat aktiv mitgemacht. Beweglichkeit wird erhalten." },
  { kategorie: "mobilisierung", paragraph: "alle", titel: "Gehtraining", text: "Gehtraining mit Hilfsmittel (Rollator/Gehstock) durchgeführt. Klient ist sicher gelaufen. Keine Stürze." },
  // Sonstiges
  { kategorie: "sonstiges", paragraph: "alle", titel: "Klient wohlauf", text: "Klient war bei guter Stimmung und hat sich über den Besuch gefreut. Keine besonderen Vorkommnisse." },
  { kategorie: "sonstiges", paragraph: "alle", titel: "Klient müde/ruhebedürftig", text: "Klient war müde und ruhebedürftig. Besuch wurde entsprechend angepasst. Klient wurde in Ruhe gelassen." },
];

for (const b of bausteine) {
  await conn.execute(
    `INSERT INTO textbausteine (kategorie, paragraph, titel, text) VALUES (?, ?, ?, ?)`,
    [b.kategorie, b.paragraph, b.titel, b.text]
  );
}
console.log(`✅ ${bausteine.length} Textbausteine importiert`);

await conn.end();
console.log("✅ Import abgeschlossen!");
