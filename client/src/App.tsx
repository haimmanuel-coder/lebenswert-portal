import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PortalAuthProvider, usePortalAuth } from "./contexts/PortalAuthContext";
import { TimerProvider } from "./contexts/TimerContext";
import Login from "./pages/Login";
import PortalApp from "./pages/PortalApp";
import ResetPasswort from "./pages/ResetPasswort";
import ErrorBoundary from "./components/ErrorBoundary";
import CookieBanner from "./components/CookieBanner";
import { Route, Switch } from "wouter";

function PortalRouter() {
  const { mitarbeiter, isLoading } = usePortalAuth();

  // Passwort-Reset-Seite ist immer zugänglich (auch ohne Login)
  if (window.location.pathname === "/reset-passwort") {
    return <ResetPasswort />;
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(150deg, #4a8c3f, #2a9d8f)",
        }}
      >
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🌿</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Lebenswert Betreuung</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Wird geladen…</div>
        </div>
      </div>
    );
  }

  if (!mitarbeiter) {
    return <Login />;
  }

  return (
    <TimerProvider>
      <PortalApp />
    </TimerProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="bottom-center" />
          <PortalAuthProvider>
            <Switch>
              <Route path="/reset-passwort" component={ResetPasswort} />
              <Route component={PortalRouter} />
            </Switch>
            <CookieBanner />
          </PortalAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
