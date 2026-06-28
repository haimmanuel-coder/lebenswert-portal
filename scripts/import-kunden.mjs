import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const kunden = [
  ['Margret','Adams','1938-01-25','Stahlsberg 63','42279','Wuppertal','+492024524675','+4915172915931','BKK Gildemeister Seidensticker','F173242079',2,'45b',524.00,0,null,0,0,null,3539.00,0,null],
  ['Jelisaveta','Aleksin','1941-01-18','Düsseldorfer Straße 52','42285','Wuppertal','+492022655758','+4915172655758','AOK Rheinland/Hamburg','Y436549926',3,'45b',602.00,156.00,'Mrz 26',0,0,null,2485.00,0,null],
  ['Joachim','Altengarten','1948-05-23','Ottostraße 67','42289','Wuppertal','+492024470034','+4915173107878','pronova Betriebskrankenkasse','C556146742',2,'45b',379.00,138.00,'Mrz 26',0,0,null,2845.00,0,null],
  ['Ilka','Aslanidis','1948-01-22','Ückerhafer Straße 11','42285','Wuppertal','+492022429275','+4915172413014','AOK NORDWEST','X034436182',3,'45b',0,120.00,null,0,0,null,2845.00,0,null],
  ['Sabine','Bakowskie','1962-06-06','Im Bredderkamp 10a','58285','Gevelsberg','+492332552787','+4915172413014','AOK NORDWEST','I496713048',3,'45b',2089.00,138.00,null,0,0,null,0,0,null],
  ['Christiane','Beek','1960-12-06','Emilienstraße 41','42287','Wuppertal',null,null,'BARMER','Z153317521',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Karin','Bernhardt','1957-05-27','Ackerstraße 10a','42289','Wuppertal','+492026628428',null,'BARMER','R842944553',2,'45b',0,156.00,null,570.00,0,null,380.00,0,null],
  ['Hella','Bomba','1943-12-15','Im Bredderkamp 18','58285','Gevelsberg','+492332801426','+4915172658895','VIACTIV Krankenkasse','I124586392',3,'45b',0,156.00,null,0,0,null,0,0,null],
  ['Karl-Heinz','Brakelsberg','1963-01-16','Krönenstraße 2','42285','Wuppertal','+492022844968','+4915177844968','SECURVITA BKK','A405151036',2,'45b',455.00,114.00,'Mrz 26',0,0,null,0,0,null],
  ['Ralf','Dahlstrom','1951-01-18','Oberer Märkischer Weg 31','58285','Gevelsberg','+492332759096','+4915172759096','Techniker Krankenkasse','W988682744',3,'45b',0,39.00,null,0,0,null,0,0,null],
  ['Elvira','del Regno','1957-07-15','Kornborn 23','58332','Schwelm','+492336363659','+4915172363659','Techniker Krankenkasse','D894370778',1,'45b',670.00,312.00,'Feb 26',0,0,null,3539.00,0,null],
  ['Marlies','Dietz','1940-04-29','Filchnerweg 17','42329','Wuppertal','+492024775177','+4915177775177','Debeka Krankenversicherungs-verein a.G.','O4808833',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Sabine','Doyé','1946-06-28','Am Wichelhausberg 16','42275','Wuppertal',null,null,'BARMER',null,2,'45b',0,84.00,null,0,0,null,0,0,null],
  ['Agnes-Marie','Draber','1934-06-30','Am Eckbusch 39','42113','Wuppertal','+492021721749',null,'DAK-Gesundheit','A298345279',3,'39',0,0,null,0,0,null,242.00,0,null],
  ['Helena','Eck','1962-01-10','Schuhardstraße 8','42275','Wuppertal','+492023180851',null,'BARMER','Y759210551',3,'45b',377.00,96.00,null,0,0,null,0,0,null],
  ['Christel','England','1955-08-04','Löhreifen 38','42279','Wuppertal','+492022623111',null,'AOK Rheinland/Hamburg','S811356870',2,'45b',0,156.00,null,0,0,null,0,0,null],
  ['Hans-Gerd','England','1950-06-09','Löhreifen 38','42279','Wuppertal','+492022623111',null,'AOK Rheinland/Hamburg','U711507455',2,'45b',0,78.00,null,0,0,null,0,0,null],
  ['Manfred','Fressdorf','1949-12-22','Liegnitzer Straße 94','42277','Wuppertal','+492024706008','+4915172706008','Techniker Krankenkasse','Q511287761',2,'45b',271.25,312.00,'Mrz 26',0,0,null,0,0,null],
  ['Eva','Gatzmaga','1931-01-23','Hainstraße 212','42109','Wuppertal','+492024723463',null,'BARMER','W708876442',2,'45b',0,0,null,0,0,null,150.00,0,null],
  ['Rosemarie','Geilhausen','1941-10-05','Zu den Erbhöfen 103','42287','Wuppertal','+492024988088','+4915190253553','BARMER','U491155018',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Christa','Gruner','1940-09-30','Wettinerstraße 69','42287','Wuppertal','+4915115387031',null,'DAK-Gesundheit','N566314453',2,'45b',1132.00,165.00,'Mrz 26',174.00,0,null,2893.50,0,null],
  ['Christa','Hahn','1937-12-09','Am Heidberg 17','42389','Wuppertal','+492022600158','+4915172600158','AOK Rheinland/Hamburg','S493904432',4,'45b',0,120.00,null,468.00,0,null,196.00,0,null],
  ['Rita Maria','Hasselbeck','1950-09-22','In der Beek 18','42113','Wuppertal','+492024641280','+4916070760045','pronova Betriebskrankenkasse','A711251650',1,'45b',0,0,null,0,0,null,0,0,null],
  ['Roland','Heine','1943-09-13','Sottweg 51','42107','Wuppertal','+492024641280','+4915172019549','BARMER',null,2,'45b',393.00,0,null,0,0,null,0,0,null],
  ['Ursula','Hoffmann','1936-11-19','Gildenstraße 77a','42277','Wuppertal','+492026641659',null,'BKK Miele Pflegekasse','J446799467',2,'45b',1111.00,114.00,'Feb 26',0,0,null,3539.00,0,null],
  ['Frank','Hundertmark','1960-12-22','Dieckerhoffstraße 25','42389','Wuppertal','+492025805769',null,'IKK Classic (Ost)','Z243264665',2,'45b',0,114.00,null,0,0,null,0,0,null],
  ['Eva','Jansen','1931-05-18','Stollenstraße 2-6','42277','Wuppertal','+4915172544782',null,'Techniker Krankenkasse','J918038935',4,'45b',0,0,null,0,0,null,0,0,null],
  ['Jakob','Kez','1956-08-16','Neuenteich 76','42107','Wuppertal','+4915140723757',null,'AOK Rheinland/Hamburg','S493808853',2,'45b',0,78.00,null,0,0,null,0,0,null],
  ['Jürgen','Kiehl','1944-03-20','Bornscheuerstraße 11','42389','Wuppertal','+4915172462181',null,'AOK Rheinland/Hamburg','N526833261',4,'45b',1500.00,0,null,0,0,null,0,0,null],
  ['Doris','Kiesewetter','1936-04-12','Wettinerstraße 2','42287','Wuppertal','+492022554512',null,'BARMER','Q149492575',3,'45b',641.50,114.00,'Mrz 26',0,0,null,2247.00,0,null],
  ['Elke','Klörs','1944-10-21','Sadowastraße 58','42115','Wuppertal','+492022447564',null,'Techniker Krankenkasse','R423768274',2,'45b',955.00,0,'Mrz 26',0,0,null,230.00,0,null],
  ['Klaus','Köpke','1939-03-04','Chamissosstraße 11','42289','Wuppertal','+4915125318377',null,'IKK classic','I538960662',2,'45b',952.00,312.00,null,0,0,null,0,0,null],
  ['Ilse','Kötter','1941-06-15','Ritterstraße 44','42285','Wuppertal','+492022883345',null,'BARMER','H133744271',1,'45b',548.50,78.00,null,0,0,null,0,0,null],
  ['Jasmin Sophie','Krüger','1986-06-18','Lohmühle 2','42399','Wuppertal','+4915179701470',null,'Techniker Krankenkasse','P924377528',3,'45b',386.00,174.00,null,0,0,null,0,0,null],
  ['Marianne','Kugler','1938-06-28','Kattenberger Schulweg 52','42113','Wuppertal','+4915173489347',null,'AOK Rheinland/Hamburg','X703545057',3,'45b',0,0,null,0,0,null,0,0,null],
  ['Hannelore','Kunze','1933-01-14','Augustastraße 76','42119','Wuppertal','+492020283206',null,'KKH Kaufmännische Krankenkasse','R284329630',1,'45b',0,120.00,null,0,0,null,0,0,null],
  ['Gisela','la Rosa','1951-09-25','Mommsensstraße 23','42289','Wuppertal','+4915112642767',null,'DAK-Gesundheit','J690610511',2,'45b',0,0,null,0,0,null,121.00,0,null],
  ['Gisela','Ladleif','1940-01-30','Schwelmer Straße 106','42389','Wuppertal','+492022451656','+4915172451656','Postbeamtenkrankenkasse','Z300013471',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Brigitte','Lemke','1950-01-20','Stahlsberg 65','42279','Wuppertal','+492022507131','+4915167500742','BARMER','Z288448456',3,'45b',531.50,0,'Mrz 26',0,0,null,3539.00,0,null],
  ['Waltraud','Loos','1937-05-18','Hainstraße 59','42109','Wuppertal','+492020620485',null,'Techniker Krankenkasse','Z288448456',3,'45b',1525.00,0,'Mrz 26',306.00,0,null,2974.00,0,null],
  ['Anke','Lustig','1940-03-30','Pickersburg 71','42107','Wuppertal',null,null,'hkk','M996309335',2,'45b',0,121.00,null,0,0,null,0,0,null],
  ['Beate','Manger','1936-12-01','Zimberweg 5','42107','Wuppertal','+492022446293',null,'IKK classic','W917908848',1,'45b',0,150.00,null,0,0,null,0,0,null],
  ['Nelli','Mede','1948-06-02','Neuenteich 76','42107','Wuppertal','+492022801376','+4915172801376','AOK Rheinland/Hamburg','Z881977988',4,'45b',861.53,156.00,'Feb 26',0,0,null,3147.00,0,null],
  ['Eva','Meisen','1941-12-11','Garterlaie 26','42327','Wuppertal','+4915175338690','+4915175338690','BARMER','Q979092824',1,'45b',0,228.00,null,0,0,null,0,0,null],
  ['Regine','Möbus',null,'Gildenstraße 75','42277','Wuppertal',null,null,'GPV Private Pflegeversicherung',null,2,'45b',0,60.00,null,0,0,null,0,0,null],
  ['Arno','Müller','1940-06-28','Gildenstraße 75','42277','Wuppertal',null,null,'GPV Private Pflegeversicherung','15/00577919',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Lutz','Münch','1943-12-18','Kemmannstraße 50','42277','Wuppertal','+4915172460512',null,'BARMER','D206198509',5,'45b',0,0,null,0,0,null,0,0,null],
  ['Renate','Niederstenschee','1948-10-10','Talperrenstraße 23','42369','Wuppertal','+4915172722099',null,'DAK-Gesundheit','Q169441837',2,'45b',1041.00,0,'Feb 26',0,0,null,2900.00,0,null],
  ['Peter','Oxenfart','1938-09-24','Hainstraße 212','42109','Wuppertal','+492022723463',null,'IKK classic','R164674523',2,'45b',1530.00,0,null,0,0,null,3539.00,0,null],
  ['Gerd','Pollmann','1936-06-23','Hunrückstraße 7','42289','Wuppertal','+4915179659322',null,'IKK classic','S247005820',2,'45b',0,156.00,null,0,0,null,0,0,null],
  ['Gabriele','Pohl',null,'Hainstraße 212','42109','Wuppertal',null,null,'BARMER',null,2,'45b',0,78.00,null,0,0,null,0,0,null],
  ['Hubert','Pohl',null,'Hainstraße 212','42109','Wuppertal',null,null,'BARMER',null,2,'45b',0,150.00,null,0,0,null,0,0,null],
  ['Elena','Pospesch','1939-03-28','Zum Großen Busch 20','42327','Wuppertal','+4915172723463',null,'Techniker Krankenkasse','G233339897',3,'45b',1537.00,228.00,null,0,0,null,1946.00,0,null],
  ['Ursula','Quadt',null,'Sonnabendstraße 34','42277','Wuppertal',null,null,'AOK Rheinland/Hamburg',null,2,'45b',0,122.00,null,0,0,null,0,0,null],
  ['Vera','Roseneck','1947-05-02','Sonnabendstraße 34','42277','Wuppertal','+4915172838460',null,'AOK Rheinland/Hamburg','D293146177',3,'45b',1675.00,162.00,'Mrz 26',0,0,null,0,0,null],
  ['Lieselore','Rubienzik','1938-05-25','Eisenstraße 18','42283','Wuppertal','+492025995226',null,'AOK Rheinland/Hamburg','L685402106',2,'45b',929.50,156.00,'Mrz 26',0,0,null,2755.00,0,null],
  ['Christel','Schlifski','1938-05-13','Obere Lichtenplatzer Straße 251','42287','Wuppertal','+492022554764',null,'DAK-Gesundheit','T904405752',2,'45b',0,114.00,null,0,0,null,240.00,0,null],
  ['Lothar','Schlifski','1937-07-06','Obere Lichtenplatzer Straße 251','42287','Wuppertal','+492022554764',null,'BARMER','F433217158',3,'45b',0,120.00,null,0,0,null,240.00,0,null],
  ['Karl-Heinz','Schoeb','1933-11-29','Lichtenplatzer Straße 207','42287','Wuppertal','+492022642412',null,'AOK Rheinland/Hamburg','M228787523',3,'45b',0,68.00,null,0,0,null,0,0,null],
  ['Ute','Schoebler','1940-12-11','Hainstraße 59','42109','Wuppertal','+492022290667',null,'BARMER','S443689070',1,'45b',649.00,546.00,'Mrz 26',0,0,null,0,0,null],
  ['Ellen','Seuthe',null,'Hainstraße 59','42109','Wuppertal',null,null,'BARMER',null,2,'45b',0,180.00,null,0,0,null,0,0,null],
  ['Edelgard','Spelter',null,'Hainstraße 59','42109','Wuppertal',null,null,'BARMER',null,2,'39',0,0,null,0,0,null,443.50,0,null],
  ['Iris','Stein','1966-03-02','Remscheider Straße 112a','42369','Wuppertal','+492022640004',null,'BARMER','G129032463',1,'45b',655.00,252.00,null,0,0,null,0,0,null],
  ['Barbara','Szesny','1936-07-13','Kleestraße 46','42289','Wuppertal','+4915258924712',null,'BARMER','G057028469',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Rolf','Teschke','1943-04-11','Werner-Buschmann-Straße 14','42553','Velbert','+4920535010098',null,'AOK Rheinland/Hamburg','D038197313',2,'45b',0,0,null,0,0,null,0,0,null],
  ['Karin','Teschke','1948-01-05','Werner-Buschmann-Straße 14','42553','Velbert','+4920535010098',null,'AOK Rheinland/Hamburg','H185318706',3,'45b',0,0,null,0,0,null,0,0,null],
  ['Doris','Tinanas','1941-02-20','Daniel-Schürmann-Weg 14','42369','Wuppertal','+4920227097197',null,'AOK Rheinland/Hamburg','X568835387',2,'45b',0,312.00,null,0,0,null,0,0,null],
  ['Ebru','Ucman','1969-05-28','Friedrich-Engels-Allee','42285','Wuppertal','+4915174900600','+4920224501','AOK Rheinland/Hamburg','Z360207137',2,'45b',1384.80,0,null,0,0,null,0,0,null],
  ['Horst','Werner','1940-10-15','Bremer Straße 103','42109','Wuppertal','+4915173060329',null,'Techniker Krankenkasse','B340186111',2,'45b',0,98.00,null,0,0,null,156.00,0,null],
  ['Claudia','Zimmermann','1977-08-17','Ritterstraße 11','42899','Remscheid','+4915172146307',null,'BARMER','Q204291312',2,'45b',0,484.00,null,0,0,null,0,0,null],
];

const sql = `INSERT INTO kunden 
  (vorname, nachname, geburtsdatum, strasse, plz, ort, telefon, mobil, kostentraeger, versicherungsnummer, pflegegrad, paragraph,
   budget45b, verbraucht45b, letzteAbrechnung45b,
   budget45a, verbraucht45a, letzteAbrechnung45a,
   budget39, verbraucht39, letzteAbrechnung39, aktiv)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;

let imported = 0;
for (const k of kunden) {
  await conn.execute(sql, k);
  imported++;
}

console.log(`✅ ${imported} Kunden importiert`);
await conn.end();
