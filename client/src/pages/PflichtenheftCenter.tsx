import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

type Tab = "termine" | "berichte" | "schnittstellen" | "analyse" | "datenschutz" | "hilfe";
const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const statusColor: Record<string, string> = { aktiv: "#15803d", testmodus: "#a16207", fehler: "#b91c1c", nicht_eingerichtet: "#64748b", freigegeben: "#15803d", eingereicht: "#a16207", entwurf: "#64748b", korrektur: "#b91c1c", bestaetigt: "#15803d", abgesagt: "#b91c1c", aenderung_angefragt: "#a16207" };

function downloadText(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Foto konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

function startGermanDictation(onText: (text: string) => void, onEnd: () => void) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast.error("Dieser Browser unterstützt Spracheingabe nicht. Bitte Chrome, Edge oder Safari verwenden.");
    onEnd();
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "de-DE";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event: any) => onText(event.results?.[0]?.[0]?.transcript || "");
  recognition.onerror = (event: any) => {
    toast.error(event.error === "not-allowed" ? "Bitte den Mikrofonzugriff erlauben." : "Die Spracheingabe konnte nicht verstanden werden.");
    onEnd();
  };
  recognition.onend = onEnd;
  recognition.start();
}
function Card({ children }: { children: React.ReactNode }) { return <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(15,23,42,.05)" }}>{children}</section>; }
function Badge({ value }: { value: string }) { return <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: "#fff", background: statusColor[value] || "#475569" }}>{value.replaceAll("_", " ")}</span>; }
const input: React.CSSProperties = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 9, padding: "10px 11px", fontSize: 14, boxSizing: "border-box", background: "#fff" };
const button: React.CSSProperties = { border: 0, borderRadius: 9, background: "#2f6f37", color: "#fff", padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const subtleButton: React.CSSProperties = { ...button, background: "#e8f5e4", color: "#255c2c" };

export default function PflichtenheftCenter() {
  const { mitarbeiter } = usePortalAuth();
  const role = mitarbeiter?.rolle || "mitarbeiter";
  const isManagement = role === "admin" || role === "teamleitung";
  const isFinance = role === "admin" || role === "buchhaltung";
  const [tab, setTab] = useState<Tab>("termine");
  const tabs = useMemo(() => [
    { id: "termine" as Tab, label: "Termine & Verfügbarkeit" },
    { id: "berichte" as Tab, label: "Besuchsberichte" },
    ...(role !== "mitarbeiter" ? [{ id: "schnittstellen" as Tab, label: "Schnittstellen & Exporte" }] : []),
    ...(isFinance ? [{ id: "analyse" as Tab, label: "Analyse & Prognose" }] : []),
    { id: "datenschutz" as Tab, label: "Datenschutz" },
    { id: "hilfe" as Tab, label: "Hilfe" },
  ], [role, isFinance]);

  return <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px clamp(12px,3vw,28px) 48px" }}>
    <div style={{ marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 26, color: "#193b20" }}>Digitales Arbeitszentrum</h1><p style={{ margin: "6px 0 0", color: "#64748b" }}>Alle neuen Funktionen aus dem Pflichtenheft an einem Ort.</p></div>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
      {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ ...button, whiteSpace: "nowrap", background: tab === t.id ? "#2f6f37" : "#fff", color: tab === t.id ? "#fff" : "#334155", border: "1px solid #cbd5e1" }}>{t.label}</button>)}
    </div>
    {tab === "termine" && <TermineVerfuegbarkeit isManagement={isManagement} />}
    {tab === "berichte" && <Berichte isManagement={isManagement} />}
    {tab === "schnittstellen" && <Schnittstellen isFinance={isFinance} isAdmin={role === "admin"} />}
    {tab === "analyse" && isFinance && <Analyse />}
    {tab === "datenschutz" && <Datenschutz isManagement={isManagement} />}
    {tab === "hilfe" && <Hilfe />}
  </div>;
}

function TermineVerfuegbarkeit({ isManagement }: { isManagement: boolean }) {
  const utils = trpc.useUtils();
  const { data: availability = [] } = trpc.pflichtenheft.verfuegbarkeit.meine.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: appointments = [] } = trpc.pflichtenheft.termine.meineOffenen.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: team = [] } = trpc.pflichtenheft.verfuegbarkeit.team.useQuery(undefined, { enabled: isManagement, refetchInterval: isManagement ? 30_000 : false });
  const { data: planningCustomers = [] } = trpc.kunden.list.useQuery(undefined, { enabled: isManagement });
  const [day, setDay] = useState(1), [from, setFrom] = useState("08:00"), [to, setTo] = useState("17:00"), [status, setStatus] = useState<"verfuegbar"|"nicht_verfuegbar"|"bevorzugt">("verfuegbar"), [note, setNote] = useState("");
  const [planCustomer, setPlanCustomer] = useState(0), [planDate, setPlanDate] = useState(new Date().toISOString().slice(0,10)), [planTime, setPlanTime] = useState("09:00"), [planDuration, setPlanDuration] = useState(2);
  const save = trpc.pflichtenheft.verfuegbarkeit.speichern.useMutation({ onSuccess: async () => { toast.success("Verfügbarkeit gespeichert"); await utils.pflichtenheft.verfuegbarkeit.meine.invalidate(); }, onError: e => toast.error(e.message) });
  const react = trpc.pflichtenheft.termine.reagieren.useMutation({ onSuccess: async () => { toast.success("Rückmeldung gespeichert"); await utils.pflichtenheft.termine.meineOffenen.invalidate(); }, onError: e => toast.error(e.message) });
  const time = trpc.pflichtenheft.termine.zeiterfassung.useMutation({ onSuccess: async () => { toast.success("Zeit gespeichert"); await utils.pflichtenheft.termine.meineOffenen.invalidate(); }, onError: e => toast.error(e.message) });
  const planningPreview = trpc.pflichtenheft.planung.vorschlaege.useMutation({ onError: e => toast.error(e.message) });
  const autoPlan = trpc.pflichtenheft.planung.automatischEinplanen.useMutation({ onSuccess: r => { toast.success(`${r.mitarbeiter} wurde eingeplant`); planningPreview.reset(); }, onError: e => toast.error(e.message) });
  const planningInput = { kundenId: planCustomer, datum: planDate, startzeit: planTime, dauerStunden: planDuration };
  return <div style={{ display: "grid", gap: 14 }}>
    <Card><h2 style={{ marginTop: 0 }}>Meine regelmäßige Verfügbarkeit</h2><p style={{ color: "#64748b" }}>Tragen Sie ein, wann die Einsatzplanung Sie einplanen darf.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <select style={input} value={day} onChange={e => setDay(Number(e.target.value))}>{WEEKDAYS.map((d,i) => <option key={d} value={i+1}>{d}</option>)}</select>
        <input style={input} type="time" value={from} onChange={e => setFrom(e.target.value)} /><input style={input} type="time" value={to} onChange={e => setTo(e.target.value)} />
        <select style={input} value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="verfuegbar">Verfügbar</option><option value="bevorzugt">Bevorzugt</option><option value="nicht_verfuegbar">Nicht verfügbar</option></select>
      </div><textarea style={{ ...input, marginTop: 10 }} placeholder="Notiz, zum Beispiel nur im Umkreis von 10 km" value={note} onChange={e => setNote(e.target.value)} />
      <button style={{ ...button, marginTop: 10 }} disabled={save.isPending} onClick={() => save.mutate({ wochentag: day, vonZeit: from, bisZeit: to, status, notiz: note || undefined })}>Speichern</button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginTop: 14 }}>{availability.map(a => <div key={a.id} style={{ padding: 10, background: "#f8fafc", borderRadius: 9 }}><strong>{WEEKDAYS[a.wochentag-1]}</strong> {a.vonZeit.slice(0,5)}–{a.bisZeit.slice(0,5)} <Badge value={a.status} /></div>)}</div>
    </Card>
    <Card><h2 style={{ marginTop: 0 }}>Meine kommenden Termine</h2>{appointments.length === 0 && <p style={{ color: "#64748b" }}>Keine kommenden Termine.</p>}{appointments.map(x => <div key={x.einsatz.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong>{x.kundeVorname} {x.kundeNachname}</strong><Badge value={x.einsatz.status} /></div><div style={{ color: "#64748b", margin: "4px 0 9px" }}>{new Date(x.einsatz.datum).toLocaleDateString("de-DE")} · {x.einsatz.startzeit?.slice(0,5) || "Zeit offen"}{x.einsatz.dauerStunden ? ` · ${x.einsatz.dauerStunden} Std.` : ""}</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button style={button} onClick={() => react.mutate({ einsatzId: x.einsatz.id, aktion: "bestaetigt" })}>Bestätigen</button><button style={subtleButton} onClick={() => { const grund = prompt("Bitte Grund oder Änderungswunsch eintragen:"); if (grund) react.mutate({ einsatzId: x.einsatz.id, aktion: "aenderung_angefragt", grund }); }}>Änderung</button><button style={{ ...button, background: "#b91c1c" }} onClick={() => { const grund = prompt("Bitte Absagegrund eintragen:"); if (grund) react.mutate({ einsatzId: x.einsatz.id, aktion: "abgesagt", grund }); }}>Absagen</button><button style={subtleButton} onClick={() => time.mutate({ einsatzId: x.einsatz.id, aktion: "start" })}>Start</button><button style={subtleButton} onClick={() => time.mutate({ einsatzId: x.einsatz.id, aktion: "ende" })}>Ende</button></div>
    </div>)}</Card>
    {isManagement && <Card><h2 style={{ marginTop: 0 }}>Automatische Einsatzplanung</h2><p style={{ color: "#64748b" }}>Das Portal vergleicht Verfügbarkeit, bevorzugte Zeiten und bereits geplante Stunden. Es plant erst nach Ihrer ausdrücklichen Bestätigung.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}><select style={input} value={planCustomer} onChange={e => setPlanCustomer(Number(e.target.value))}><option value={0}>Kunde wählen</option>{planningCustomers.map(k => <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>)}</select><input style={input} type="date" min={new Date().toISOString().slice(0,10)} value={planDate} onChange={e => setPlanDate(e.target.value)} /><input style={input} type="time" value={planTime} onChange={e => setPlanTime(e.target.value)} /><input style={input} type="number" min="0.5" max="10" step="0.5" value={planDuration} onChange={e => setPlanDuration(Number(e.target.value))} aria-label="Dauer in Stunden" /></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}><button style={subtleButton} disabled={!planCustomer || planningPreview.isPending} onClick={() => planningPreview.mutate(planningInput)}>Passende Mitarbeitende prüfen</button><button style={button} disabled={!planCustomer || autoPlan.isPending || !(planningPreview.data?.vorschlaege.length)} onClick={() => { if (confirm(`Besten Vorschlag für ${planDate} um ${planTime} Uhr verbindlich einplanen?`)) autoPlan.mutate(planningInput); }}>Besten Vorschlag einplanen</button></div>
      {planningPreview.data && <div style={{ marginTop: 12 }}>{planningPreview.data.vorschlaege.length === 0 ? <p>Kein geeigneter Mitarbeiter gefunden.</p> : planningPreview.data.vorschlaege.slice(0,5).map((item, index) => <div key={item.mitarbeiterId} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid #e2e8f0" }}><span><strong>{index + 1}. {item.name}</strong><br/><small style={{ color: "#64748b" }}>{item.verfuegbarkeit} · {item.auslastung.toFixed(1)} Std. geplant</small></span><Badge value={`Wertung ${item.score}`} /></div>)}</div>}
    </Card>}
    {isManagement && <Card><h2 style={{ marginTop: 0 }}>Team-Verfügbarkeit</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ textAlign: "left" }}>Mitarbeiter</th><th>Tag</th><th>Zeit</th><th>Status</th></tr></thead><tbody>{team.map(x => <tr key={`${x.verfuegbarkeit.id}`}><td>{x.vorname} {x.nachname}</td><td style={{ textAlign: "center" }}>{WEEKDAYS[x.verfuegbarkeit.wochentag-1]}</td><td style={{ textAlign: "center" }}>{x.verfuegbarkeit.vonZeit.slice(0,5)}–{x.verfuegbarkeit.bisZeit.slice(0,5)}</td><td style={{ textAlign: "center" }}><Badge value={x.verfuegbarkeit.status} /></td></tr>)}</tbody></table></div></Card>}
  </div>;
}

function Berichte({ isManagement }: { isManagement: boolean }) {
  const utils = trpc.useUtils();
  const { data: reports = [] } = trpc.pflichtenheft.berichte.liste.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: customers = [] } = trpc.kunden.list.useQuery();
  const [customer, setCustomer] = useState(0), [date, setDate] = useState(new Date().toISOString().slice(0,10)), [tasks, setTasks] = useState(""), [observations, setObservations] = useState(""), [special, setSpecial] = useState(""), [next, setNext] = useState(""), [isDictating, setIsDictating] = useState(false), [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const suggestion = trpc.pflichtenheft.berichte.kiVorschlag.useMutation({ onSuccess: r => setNext(r.text), onError: e => toast.error(e.message) });
  const save = trpc.pflichtenheft.berichte.speichern.useMutation({ onSuccess: async () => { toast.success("Bericht gespeichert"); setTasks(""); setObservations(""); setSpecial(""); setNext(""); setPhotoFiles([]); await utils.pflichtenheft.berichte.liste.invalidate(); }, onError: e => toast.error(e.message) });
  const uploadPhotos = trpc.pflichtenheft.berichte.fotosHochladen.useMutation();
  const submitReport = async (status: "entwurf" | "eingereicht") => {
    if (!customer) return toast.error("Bitte zuerst einen Kunden wählen.");
    if (tasks.trim().length < 3) return toast.error("Bitte die durchgeführten Tätigkeiten eintragen.");
    try {
      const fotos = await Promise.all(photoFiles.map(async file => ({ dateiname: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64: await fileAsDataUrl(file) })));
      const upload = fotos.length ? await uploadPhotos.mutateAsync({ fotos }) : { urls: [] as string[] };
      await save.mutateAsync({ kundenId: customer, datum: date, taetigkeiten: tasks, beobachtungen: observations || undefined, besonderheiten: special || undefined, naechsteSchritte: next || undefined, kiVorschlag: next || undefined, anhangUrls: upload.urls, status });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Bericht konnte nicht gespeichert werden."); }
  };
  const approve = trpc.pflichtenheft.berichte.freigeben.useMutation({ onSuccess: async () => { toast.success("Status aktualisiert"); await utils.pflichtenheft.berichte.liste.invalidate(); }, onError: e => toast.error(e.message) });
  return <div style={{ display: "grid", gap: 14 }}><Card><h2 style={{ marginTop: 0 }}>Digitaler Besuchsbericht</h2>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}><select style={input} value={customer} onChange={e => setCustomer(Number(e.target.value))}><option value={0}>Kunde wählen</option>{customers.map(k => <option key={k.id} value={k.id}>{k.vorname} {k.nachname}</option>)}</select><input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
    <div style={{ position: "relative", marginTop: 10 }}><textarea style={{ ...input, paddingRight: 150 }} rows={3} placeholder="Durchgeführte Tätigkeiten" value={tasks} onChange={e => setTasks(e.target.value)} /><button type="button" style={{ ...subtleButton, position: "absolute", right: 7, top: 7, padding: "7px 10px" }} disabled={isDictating} onClick={() => { setIsDictating(true); startGermanDictation(text => setTasks(current => [current, text].filter(Boolean).join(" ")), () => setIsDictating(false)); }}>{isDictating ? "Hört zu …" : "Per Mikrofon"}</button></div><textarea style={{ ...input, marginTop: 10 }} rows={2} placeholder="Beobachtungen" value={observations} onChange={e => setObservations(e.target.value)} /><textarea style={{ ...input, marginTop: 10 }} rows={2} placeholder="Besonderheiten" value={special} onChange={e => setSpecial(e.target.value)} /><textarea style={{ ...input, marginTop: 10 }} rows={3} placeholder="Nächste Schritte / digitaler Hinweis" value={next} onChange={e => setNext(e.target.value)} />
    <label style={{ ...subtleButton, display: "inline-flex", marginTop: 10, alignItems: "center", gap: 7 }}>Fotos aufnehmen oder auswählen<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple style={{ display: "none" }} onChange={e => { const files = Array.from(e.target.files || []); const invalid = files.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024); if (invalid) return toast.error("Nur JPG, PNG oder WebP bis 5 MB pro Foto."); setPhotoFiles(files.slice(0, 4)); }} /></label>{photoFiles.length > 0 && <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{photoFiles.length} Foto(s) ausgewählt: {photoFiles.map(file => file.name).join(", ")}</div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}><button style={subtleButton} onClick={() => suggestion.mutate({ taetigkeiten: tasks, beobachtungen: observations || undefined, besonderheiten: special || undefined })}>Dokumentationshinweis erzeugen</button><button style={subtleButton} disabled={save.isPending || uploadPhotos.isPending} onClick={() => submitReport("entwurf")}>Entwurf speichern</button><button style={button} disabled={save.isPending || uploadPhotos.isPending} onClick={() => submitReport("eingereicht")}>{save.isPending || uploadPhotos.isPending ? "Wird gespeichert …" : "Einreichen"}</button></div>
    <p style={{ fontSize: 12, color: "#64748b" }}>Der diktierte Text und der automatische Hinweis werden vor dem Speichern sichtbar angezeigt und können geändert werden. Sie ersetzen keine fachliche oder medizinische Entscheidung.</p>
  </Card><Card><h2 style={{ marginTop: 0 }}>Gespeicherte Berichte</h2>{reports.map(x => <div key={x.bericht.id} style={{ borderBottom: "1px solid #e2e8f0", padding: "11px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong>{x.kundeVorname} {x.kundeNachname}</strong><Badge value={x.bericht.status} /></div><div style={{ fontSize: 13, color: "#64748b" }}>{new Date(x.bericht.datum).toLocaleDateString("de-DE")} · {x.mitarbeiterVorname} {x.mitarbeiterNachname}</div><p>{x.bericht.taetigkeiten}</p>{(() => { try { const urls = JSON.parse(x.bericht.anhangUrls || "[]") as string[]; return urls.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>{urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" style={{ ...subtleButton, textDecoration: "none" }}>Foto {index + 1} öffnen</a>)}</div> : null; } catch { return null; } })()}{isManagement && x.bericht.status === "eingereicht" && <div style={{ display: "flex", gap: 8 }}><button style={button} onClick={() => approve.mutate({ id: x.bericht.id, aktion: "freigegeben" })}>Freigeben</button><button style={{ ...button, background: "#a16207" }} onClick={() => approve.mutate({ id: x.bericht.id, aktion: "korrektur", hinweis: prompt("Korrekturhinweis:") || undefined })}>Korrektur</button></div>}</div>)}</Card></div>;
}

function Schnittstellen({ isFinance, isAdmin }: { isFinance: boolean; isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const { data: connections = [] } = trpc.pflichtenheft.integrationen.liste.useQuery(undefined, { enabled: isAdmin, refetchInterval: isAdmin ? 30_000 : false });
  const { data: cache } = trpc.pflichtenheft.integrationen.cacheStatus.useQuery(undefined, { enabled: isAdmin, refetchInterval: isAdmin ? 15_000 : false });
  const [provider, setProvider] = useState<"datev"|"optadata"|"pflegekassen"|"gehaltsprogramm"|"email"|"ebrief"|"redis"|"maps"|"ki">("datev"), [name, setName] = useState(""), [url, setUrl] = useState(""), [secret, setSecret] = useState("");
  const save = trpc.pflichtenheft.integrationen.speichern.useMutation({ onSuccess: async () => { toast.success("Schnittstelle gespeichert"); await utils.pflichtenheft.integrationen.liste.invalidate(); }, onError: e => toast.error(e.message) });
  const test = trpc.pflichtenheft.integrationen.testen.useMutation({ onSuccess: async r => { toast.success(`Verbindung erreichbar (HTTP ${r.status})`); await utils.pflichtenheft.integrationen.liste.invalidate(); }, onError: e => toast.error(e.message) });
  const datev = trpc.pflichtenheft.exporte.datevMitarbeiter.useMutation({ onSuccess: r => { downloadText(r.dateiname, r.csv); toast.success(`${r.anzahl} Datensätze exportiert`); }, onError: e => toast.error(e.message) });
  const opta = trpc.pflichtenheft.exporte.optadataLeistungen.useMutation({ onSuccess: r => { downloadText(r.dateiname, r.csv); toast.success(`${r.anzahl} Datensätze exportiert`); }, onError: e => toast.error(e.message) });
  const month = new Date().toISOString().slice(0,7);
  return <div style={{ display: "grid", gap: 14 }}>
    {isAdmin && <Card><h2 style={{ marginTop: 0 }}>Schnittstellen-Cockpit</h2><p style={{ color: "#64748b" }}>Zugangsdaten werden verschlüsselt gespeichert. Ein Anbieter wird erst nach erfolgreichem Test als erreichbar angezeigt.</p>{cache && <div style={{ padding: 10, marginBottom: 12, borderRadius: 9, background: cache.redisVerbunden ? "#ecfdf5" : "#f8fafc", border: "1px solid #cbd5e1" }}><strong>Abfrage-Cache:</strong> {cache.redisVerbunden ? "Redis aktiv" : cache.redisKonfiguriert ? "Redis konfiguriert – Rückfall aktiv" : "lokaler Kurzzeit-Cache aktiv"}<div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Kennzahlen werden kurz zwischengespeichert und regelmäßig automatisch aktualisiert.</div></div>}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9 }}><select style={input} value={provider} onChange={e => setProvider(e.target.value as typeof provider)}>{["datev","optadata","pflegekassen","gehaltsprogramm","email","ebrief","redis","maps","ki"].map(x => <option key={x}>{x}</option>)}</select><input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Bezeichnung" /><input style={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="Offizielle API-Adresse" /><input style={input} type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="API-Schlüssel / Zugang" /></div><button style={{ ...button, marginTop: 10 }} onClick={() => save.mutate({ anbieter: provider, bezeichnung: name || provider.toUpperCase(), basisUrl: url || undefined, secret: secret || undefined })}>Sicher speichern</button>
      <div style={{ marginTop: 14 }}>{connections.map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}><div><strong>{c.bezeichnung}</strong><div style={{ fontSize: 12, color: "#64748b" }}>{c.anbieter} · {c.basisUrl || "API-Adresse fehlt"} · {c.zugangGespeichert ? "Zugang gespeichert" : "kein Zugang"}</div></div><div style={{ display: "flex", gap: 7, alignItems: "center" }}><Badge value={c.status} /><button style={subtleButton} onClick={() => test.mutate({ id: c.id })}>Testen</button></div></div>)}</div>
    </Card>}
    {isFinance && <Card><h2 style={{ marginTop: 0 }}>Sichere Abrechnungsexporte</h2><p style={{ color: "#64748b" }}>DATEV enthält ausschließlich Mitarbeiter mit dokumentierter Einwilligung. OptaData exportiert Leistungsdaten im gewählten Zeitraum.</p><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button style={button} onClick={() => datev.mutate({ monat: month })}>DATEV-CSV {month}</button><button style={button} onClick={() => opta.mutate({ von: `${month}-01`, bis: `${month}-31` })}>OptaData-CSV {month}</button></div></Card>}
    <Card><h2 style={{ marginTop: 0 }}>Echte Anbieter-Anbindung</h2><p style={{ color: "#475569" }}>DATEV, OptaData, Pflegekassen, E-Brief und Gehaltsprogramme benötigen jeweils einen offiziellen Vertrag, Zugangsdaten und je nach Anbieter eine Freischaltung oder Zertifizierung. Das Portal simuliert keinen Erfolg: Solange diese Angaben fehlen, bleibt der Status sichtbar auf „nicht eingerichtet“.</p></Card>
  </div>;
}

function Analyse() {
  const { data } = trpc.pflichtenheft.analyse.dashboard.useQuery(undefined, { refetchInterval: 30_000 });
  const utils = trpc.useUtils();
  const month = new Date().toISOString().slice(0,7);
  const [type, setType] = useState<"budget"|"personal"|"auslastung"|"umsatz">("auslastung"), [basis, setBasis] = useState(0), [growth, setGrowth] = useState(5);
  const forecast = trpc.pflichtenheft.analyse.prognoseErstellen.useMutation({ onSuccess: async r => { toast.success(`Prognose: ${r.prognose.toLocaleString("de-DE")}`); await utils.pflichtenheft.analyse.prognosen.invalidate(); }, onError: e => toast.error(e.message) });
  if (!data) return <Card><p>Analyse wird geladen …</p></Card>;
  return <div style={{ display: "grid", gap: 14 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>{Object.entries(data.kennzahlen).map(([k,v]) => <Card key={k}><div style={{ color: "#64748b", fontSize: 12, textTransform: "capitalize" }}>{k.replaceAll(/([A-Z])/g," $1")}</div><strong style={{ fontSize: 24, color: "#193b20" }}>{typeof v === "number" ? v.toLocaleString("de-DE") : v}</strong></Card>)}</div><Card><h2 style={{ marginTop: 0 }}>Planbare Prognose</h2><p style={{ color: "#64748b" }}>Rechnet einen transparenten Zukunftswert aus Basiswert plus erwarteter Veränderung. Keine Blackbox.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 9 }}><select style={input} value={type} onChange={e => setType(e.target.value as typeof type)}><option value="budget">Budget</option><option value="personal">Personal</option><option value="auslastung">Auslastung</option><option value="umsatz">Umsatz</option></select><input style={input} type="number" value={basis} onChange={e => setBasis(Number(e.target.value))} placeholder="Basiswert" /><input style={input} type="number" value={growth} onChange={e => setGrowth(Number(e.target.value))} placeholder="Veränderung %" /></div><button style={{ ...button, marginTop: 10 }} onClick={() => forecast.mutate({ monat: month, typ: type, basisWert: basis, wachstumProzent: growth })}>Prognose speichern</button></Card></div>;
}

function ZweiFaktor() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.portal.zweiFaktorStatus.useQuery();
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const start = trpc.portal.zweiFaktorStarten.useMutation({ onSuccess: r => { setQr(r.qrCodeDataUrl); setSecret(r.secret); toast.success("Einrichtung gestartet"); }, onError: e => toast.error(e.message) });
  const confirm = trpc.portal.zweiFaktorBestaetigen.useMutation({ onSuccess: async () => { toast.success("Zwei-Faktor-Anmeldung ist jetzt aktiv"); setQr(""); setSecret(""); setCode(""); await utils.portal.zweiFaktorStatus.invalidate(); }, onError: e => toast.error(e.message) });
  const disable = trpc.portal.zweiFaktorDeaktivieren.useMutation({ onSuccess: async () => { toast.success("Zwei-Faktor-Anmeldung wurde deaktiviert"); setCode(""); setPassword(""); await utils.portal.zweiFaktorStatus.invalidate(); }, onError: e => toast.error(e.message) });
  return <Card><h2 style={{ marginTop: 0 }}>Zwei-Faktor-Anmeldung</h2><p style={{ color: "#475569" }}>Wie eine zweite Haustür: Zusätzlich zum Passwort benötigen Sie bei jeder Anmeldung einen wechselnden Code aus Ihrer Authenticator-App.</p>
    <div style={{ marginBottom: 12 }}><Badge value={status?.aktiv ? "aktiv" : "nicht_eingerichtet"} /></div>
    {!status?.aktiv && !qr && <button style={button} onClick={() => start.mutate()}>Jetzt sicher einrichten</button>}
    {!status?.aktiv && qr && <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,280px) 1fr", gap: 16, alignItems: "start" }}><img src={qr} alt="QR-Code für die Authenticator-App" style={{ width: "100%", maxWidth: 280, border: "1px solid #cbd5e1", borderRadius: 10 }} /><div><ol style={{ lineHeight: 1.8 }}><li>Authenticator-App öffnen.</li><li>QR-Code scannen.</li><li>Sechsstelligen Code unten eingeben.</li></ol><div style={{ fontSize: 12, color: "#64748b", wordBreak: "break-all", marginBottom: 9 }}>Manueller Schlüssel: {secret}</div><input style={input} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0,6))} inputMode="numeric" placeholder="6-stelliger Code" /><button style={{ ...button, marginTop: 9 }} disabled={code.length !== 6} onClick={() => confirm.mutate({ code })}>Code prüfen und aktivieren</button></div></div>}
    {status?.aktiv && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 9 }}><input style={input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Aktuelles Passwort" /><input style={input} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0,6))} inputMode="numeric" placeholder="6-stelliger Code" /><button style={{ ...button, background: "#b91c1c" }} disabled={!password || code.length !== 6} onClick={() => disable.mutate({ passwort: password, code })}>Schutz deaktivieren</button></div>}
  </Card>;
}

function Datenschutz({ isManagement }: { isManagement: boolean }) {
  const utils = trpc.useUtils();
  const { data: consents = [] } = trpc.pflichtenheft.datenschutz.meineEinwilligungen.useQuery();
  const { data: docs = [] } = trpc.pflichtenheft.datenschutz.dokumente.useQuery(undefined, { enabled: isManagement });
  const consent = trpc.pflichtenheft.datenschutz.datevEinwilligung.useMutation({ onSuccess: async () => { toast.success("Entscheidung revisionssicher gespeichert"); await utils.pflichtenheft.datenschutz.meineEinwilligungen.invalidate(); }, onError: e => toast.error(e.message) });
  return <div style={{ display: "grid", gap: 14 }}><ZweiFaktor /><Card><h2 style={{ marginTop: 0 }}>Einwilligung für DATEV-Personaldaten</h2><p>Nur mit Ihrer ausdrücklichen Zustimmung dürfen Ihre abrechnungsrelevanten Personaldaten in einen DATEV-Export aufgenommen werden. Sie können die Zustimmung jederzeit widerrufen.</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={button} onClick={() => consent.mutate({ erteilt: true, dokumentVersion: "1.0" })}>Einwilligen</button><button style={{ ...button, background: "#b91c1c" }} onClick={() => consent.mutate({ erteilt: false, dokumentVersion: "1.0" })}>Widerrufen</button></div><div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>{consents[0] ? `Letzter Stand: ${consents[0].erteilt ? "erteilt" : "widerrufen"} am ${new Date(consents[0].createdAt).toLocaleString("de-DE")}` : "Noch keine Entscheidung gespeichert."}</div></Card>
    <Card><h2 style={{ marginTop: 0 }}>Datenschutz-Grundsätze</h2><ul style={{ lineHeight: 1.8 }}><li>Verschlüsselte Anmeldung und geschützte Sitzungen</li><li>Rollenrechte nach dem Prinzip „nur so viel Zugriff wie nötig“</li><li>Audit-Log für sicherheitsrelevante Aktionen</li><li>Soft-Delete statt unkontrollierter Sofortlöschung</li><li>Dokumentierte Einwilligungen, Löschanfragen und Backup-Nachweise</li></ul></Card>
    {isManagement && <Card><h2 style={{ marginTop: 0 }}>Hinterlegte Datenschutzdokumente</h2>{docs.length ? docs.map(d => <div key={d.id} style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}><strong>{d.titel}</strong> · Version {d.version}</div>) : <p style={{ color: "#a16207" }}>Noch keine AVV-, Löschkonzept- oder Verarbeitungsverzeichnis-Dokumente hinterlegt.</p>}</Card>}
  </div>;
}

function Hilfe() { return <div style={{ display: "grid", gap: 14 }}><Card><h2 style={{ marginTop: 0 }}>Schnellstart in vier Schritten</h2><ol style={{ lineHeight: 1.9 }}><li>Unter „Termine & Verfügbarkeit“ eigene Arbeitszeiten eintragen.</li><li>Kommende Termine bestätigen oder mit Begründung ändern/absagen.</li><li>Nach dem Besuch einen Bericht als Entwurf speichern und anschließend einreichen.</li><li>Im Datenschutzbereich die DATEV-Einwilligung bewusst erteilen oder widerrufen.</li></ol></Card><Card><h2 style={{ marginTop: 0 }}>Rollen einfach erklärt</h2><p><strong>Mitarbeiter:</strong> eigene Termine, Zeiten, Berichte und Verfügbarkeit. <strong>Teamleitung:</strong> zusätzlich Teamübersicht und Berichtsfreigabe. <strong>Buchhaltung:</strong> Analysen und Abrechnungsexporte. <strong>Admin:</strong> vollständige Verwaltung, Schnittstellen, Datenschutz und Rollen.</p></Card><Card><h2 style={{ marginTop: 0 }}>Wichtiger Sicherheitshinweis</h2><p>Automatische Hinweise unterstützen die Dokumentation. Medizinische Entscheidungen, Pflegebeurteilungen oder Notfallmaßnahmen müssen weiterhin von qualifizierten Menschen getroffen werden.</p></Card></div>; }
