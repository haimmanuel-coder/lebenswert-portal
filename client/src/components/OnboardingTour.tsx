import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "lebensnah_onboarding_done_v2";

export type TourStep = {
  id: string;
  title: string;
  emoji: string;
  beschreibung: string;
  tipp?: string;
  aktion?: string;
  bild?: string; // emoji als Illustration
};

const SCHRITTE: TourStep[] = [
  {
    id: "willkommen",
    emoji: "🌿",
    title: "Willkommen im Lebensnah-Portal!",
    beschreibung:
      "Schön, dass du dabei bist! Dieses Portal ist dein digitaler Begleiter für den Pflegealltag. Hier erfasst du Einsätze, erstellst Leistungsnachweise, dokumentierst Fahrten und vieles mehr - alles an einem Ort, jederzeit erreichbar.",
    tipp: "Das Portal funktioniert auch offline - du kannst Einsätze auch ohne Internetverbindung erfassen. Sobald du wieder online bist, werden die Daten automatisch synchronisiert.",
    aktion: "Klicke auf 'Weiter', um das Portal Schritt fuer Schritt kennenzulernen.",
    bild: "🏠",
  },
  {
    id: "navigation",
    emoji: "🧭",
    title: "So findest du dich zurecht",
    beschreibung:
      "Das Menü auf der linken Seite ist in 8 Hauptbereiche gegliedert: 🏠 Dashboard, 📅 Planung, 👥 Kunden, 👨 Mitarbeiter, 📈 Controlling, ✅ Qualität, 🔔 Kommunikation und ⚙️ Einstellungen. Jeder Bereich lässt sich mit einem Klick auf den Titel ein- und ausklappen.",
    tipp: "Nutze das 🔍 Suchfeld oben in der Sidebar, um schnell jeden Menüpunkt zu finden – tippe einfach den Namen ein, z.B. 'Urlaub' oder 'Fahrt'.",
    aktion: "Klicke auf einen Bereichstitel im linken Menü, um ihn ein- oder auszuklappen.",
    bild: "📱",
  },
  {
    id: "einsatz",
    emoji: "📅",
    title: "Einsatz erfassen - so geht's",
    beschreibung:
      "Ein Einsatz ist ein Pflegebesuch bei einem Kunden. Tippe auf den Bereich 'Einsaetze' in der Navigation. Dort siehst du alle geplanten und abgeschlossenen Einsaetze. Um einen neuen Einsatz zu starten, tippe auf den gruenen '+ Neuer Einsatz'-Button.",
    tipp: "Beim Abschluss eines Einsatzes kannst du direkt die geleisteten Stunden eintragen und sowohl deine eigene als auch die Unterschrift des Kunden einholen - alles digital, kein Papier nötig!",
    aktion: "Wechsle zur Einsatz-Seite und schau dir die Liste deiner Einsätze an.",
    bild: "📋",
  },
  {
    id: "leistungsnachweis",
    emoji: "📄",
    title: "Leistungsnachweis einreichen",
    beschreibung:
      "Nach einem Einsatz muss ein Leistungsnachweis erstellt werden - das ist der offizielle Nachweis gegenueber der Krankenkasse. Tippe auf den Bereich 'Leistungsnachweise'. Hier siehst du alle offenen und eingereichten Nachweise.",
    tipp: "Du kannst jeden Leistungsnachweis als professionelles PDF herunterladen - mit Unterschriften, Stempel und allen relevanten Daten. Ideal für die Abrechnung mit der Pflegekasse.",
    aktion: "Tippe auf einen Leistungsnachweis und dann auf 'PDF', um das Dokument zu sehen.",
    bild: "📑",
  },
  {
    id: "unterschrift",
    emoji: "✍️",
    title: "Digitale Unterschrift leisten",
    beschreibung:
      "Beim Abschluss eines Einsatzes oder beim Einreichen eines Leistungsnachweises wirst du nach einer Unterschrift gefragt. Zeichne einfach mit dem Finger auf dem Unterschriftsfeld. Es gibt zwei Felder: eines für dich als Mitarbeiter und eines für den Kunden.",
    tipp: "Hast du dich verzeichnet? Kein Problem! Tippe auf den roten 'Zuruecksetzen'-Button und zeichne die Unterschrift einfach neu. Nach dem Zeichnen siehst du sofort eine kleine Vorschau.",
    aktion: "Öffne einen Einsatz und probiere das Unterschriftsfeld aus.",
    bild: "✍️",
  },
  {
    id: "fahrt",
    emoji: "🚗",
    title: "Fahrt dokumentieren",
    beschreibung:
      "Unter 👨 Mitarbeiter → 🚗 Mobilität findest du das kombinierte Fahrten-Modul. Es enthält zwei Tabs: 'Fahrtenbuch' zum Erfassen einzelner Fahrten und 'Fahrtabrechnung' für die monatliche Gesamtabrechnung.",
    tipp: "Admins und Teamleitungen sehen beide Tabs. Normale Mitarbeiter sehen nur das Fahrtenbuch.",
    aktion: "Wechsle zu 👨 Mitarbeiter → 🚗 Mobilität und erkunde die beiden Tabs.",
    bild: "🗺️",
  },
  {
    id: "offline",
    emoji: "📶",
    title: "Offline arbeiten - kein Problem!",
    beschreibung:
      "Das Portal funktioniert auch ohne Internetverbindung. Wenn du offline bist, erscheint oben ein gelbes 'OFFLINE'-Badge. Einsaetze, die du offline erfasst, werden in einer lokalen Warteschlange gespeichert und automatisch uebertragen, sobald du wieder online bist.",
    tipp: "Stelle sicher, dass du die App mindestens einmal online geöffnet hast, bevor du in ein Gebiet ohne Empfang fährst. So werden alle aktuellen Daten vorgeladen.",
    aktion: "Du erkennst den Offline-Modus am gelben Badge oben in der Kopfzeile.",
    bild: "📡",
  },
  {
    id: "hilfe",
    emoji: "🆘",
    title: "Hilfe & nächste Schritte",
    beschreibung:
      "Tour abgeschlossen – herzlichen Glückwunsch! Du kennst jetzt alle 8 Hauptbereiche. Bei Fragen steht dir der 🤖 KI-Assistent unten rechts im Portal zur Verfügung – er beantwortet alle Fragen rund um das Portal, Pflegeprozesse und Funktionen.",
    tipp: "Tipp für Admins: Unter ⚙️ Einstellungen → Admin-Panel findest du die vollständige Mitarbeiter- und Kundenverwaltung, Exporte und Systemeinstellungen.",
    aktion: "Klicke auf 'Tour beenden', um loszulegen. Viel Erfolg!",
    bild: "🎉",
  },
];

interface OnboardingTourProps {
  onClose?: () => void;
  forceShow?: boolean;
}

export default function OnboardingTour({ onClose, forceShow }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setStep(0);
      return;
    }
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Kurze Verzögerung damit das Portal erst lädt
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [forceShow]);

  const goTo = useCallback((next: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 200);
  }, [animating]);

  const handleClose = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const handleNext = () => {
    if (step < SCHRITTE.length - 1) goTo(step + 1);
    else handleClose();
  };

  const handlePrev = () => {
    if (step > 0) goTo(step - 1);
  };

  if (!visible) return null;

  const current = SCHRITTE[step];
  const progress = ((step + 1) / SCHRITTE.length) * 100;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(4px)",
    }}>
      {/* Hintergrund-Klick schließt Tour */}
      <div style={{ position: "absolute", inset: 0 }} onClick={handleClose} />

      {/* Tour-Karte */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: 480,
        background: "#fff",
        borderRadius: "24px 24px 0 0",
        padding: "0 0 24px 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        opacity: animating ? 0 : 1,
        transform: animating ? "translateY(20px)" : "translateY(0)",
        maxHeight: "85vh",
        overflowY: "auto",
      }}>
        {/* Griff */}
        <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "12px auto 0" }} />

        {/* Fortschrittsbalken */}
        <div style={{ height: 3, background: "#f3f4f6", margin: "12px 24px 0" }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #4a8c3f, #2a9d8f)",
            borderRadius: 2,
            transition: "width 0.4s ease",
          }} />
        </div>

        {/* Schritt-Zähler */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 24px 0" }}>
          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
            Schritt {step + 1} von {SCHRITTE.length}
          </span>
          <button onClick={handleClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {/* Illustration */}
        <div style={{
          textAlign: "center",
          padding: "20px 24px 0",
          fontSize: 64,
          lineHeight: 1,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
        }}>
          {current.bild}
        </div>

        {/* Inhalt */}
        <div style={{ padding: "16px 24px 0" }}>
          {/* Emoji + Titel */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{
              fontSize: 28,
              background: "linear-gradient(135deg, #e8f5e4, #d1fae5)",
              borderRadius: 12,
              padding: "6px 10px",
              display: "inline-block",
            }}>{current.emoji}</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1f2937", lineHeight: 1.3 }}>{current.title}</div>
          </div>

          {/* Beschreibung */}
          <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.65, margin: "0 0 14px 0" }}>
            {current.beschreibung}
          </p>

          {/* Tipp-Box */}
          {current.tipp && (
            <div style={{
              background: "linear-gradient(135deg, #fef3c7, #fde68a22)",
              border: "1px solid #fcd34d",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>💡 Profi-Tipp</div>
              <p style={{ fontSize: 13, color: "#78350f", margin: 0, lineHeight: 1.55 }}>{current.tipp}</p>
            </div>
          )}

          {/* Aktion-Hinweis */}
          {current.aktion && (
            <div style={{
              background: "#f0faf0",
              border: "1px solid #86efac",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 3 }}>👉 Jetzt ausprobieren</div>
              <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.5 }}>{current.aktion}</p>
            </div>
          )}

          {/* Schritt-Punkte */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            {SCHRITTE.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? "#4a8c3f" : i < step ? "#86efac" : "#e5e7eb",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                ← Zurück
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                flex: step > 0 ? 2 : 1,
                padding: "13px 0",
                background: "linear-gradient(135deg, #4a8c3f, #2a9d8f)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(74,140,63,0.35)",
                transition: "transform 0.1s ease, box-shadow 0.1s ease",
              }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
            >
              {step < SCHRITTE.length - 1 ? "Weiter →" : "🎉 Tour beenden"}
            </button>
          </div>

          {/* Tour überspringen */}
          {step === 0 && (
            <button
              onClick={handleClose}
              style={{ width: "100%", marginTop: 10, padding: "10px 0", background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              Tour überspringen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook zum manuellen Starten der Tour
export function useOnboardingTour() {
  const [show, setShow] = useState(false);
  const startTour = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShow(true);
  };
  const closeTour = () => setShow(false);
  return { show, startTour, closeTour };
}
