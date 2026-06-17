import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface TimerContextType {
  timerSecs: number;
  isRunning: boolean;
  isPaused: boolean;
  timerLabel: string;
  timerDisplay: string;
  start: () => void;
  pause: () => void;
  stop: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function secsToDisplay(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerSecs, setTimerSecs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  // Restore from sessionStorage
  useEffect(() => {
    const ts = sessionStorage.getItem("lb_timer_start");
    const paused = sessionStorage.getItem("lb_timer_paused");
    const savedSecs = sessionStorage.getItem("lb_timer_secs");
    if (ts && !paused) {
      startRef.current = parseInt(ts);
      setIsRunning(true);
      setIsPaused(false);
      intervalRef.current = setInterval(() => {
        setTimerSecs(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else if (savedSecs) {
      setTimerSecs(parseInt(savedSecs));
      setIsPaused(true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const savedSecs = parseInt(sessionStorage.getItem("lb_timer_secs") || "0");
    startRef.current = Date.now() - savedSecs * 1000;
    sessionStorage.setItem("lb_timer_start", String(startRef.current));
    sessionStorage.removeItem("lb_timer_paused");
    setIsRunning(true);
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setTimerSecs(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  }, []);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const secs = Math.floor((Date.now() - startRef.current) / 1000);
    setTimerSecs(secs);
    setIsRunning(false);
    setIsPaused(true);
    sessionStorage.setItem("lb_timer_secs", String(secs));
    sessionStorage.setItem("lb_timer_paused", "1");
    sessionStorage.removeItem("lb_timer_start");
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTimerSecs(0);
    setIsRunning(false);
    setIsPaused(false);
    sessionStorage.removeItem("lb_timer_start");
    sessionStorage.removeItem("lb_timer_paused");
    sessionStorage.removeItem("lb_timer_secs");
  }, []);

  const timerLabel = isRunning ? "Einsatz läuft…" : isPaused ? "Pausiert" : "Kein aktiver Einsatz";
  const timerDisplay = secsToDisplay(timerSecs);

  return (
    <TimerContext.Provider value={{ timerSecs, isRunning, isPaused, timerLabel, timerDisplay, start, pause, stop }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
