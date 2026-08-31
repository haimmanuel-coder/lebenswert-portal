// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  startTour: vi.fn(),
  trpc: (() => {
    let proxy: Record<string | symbol, unknown>;
    proxy = new Proxy({}, {
      get(_target, property) {
        if (property === "useQuery") return () => ({ data: [] });
        return proxy;
      },
    });
    return proxy;
  })(),
}));

vi.mock("@/lib/trpc", () => ({ trpc: mocks.trpc }));
vi.mock("@/contexts/PortalAuthContext", () => ({
  usePortalAuth: () => ({
    mitarbeiter: { id: 42, vorname: "Erika", nachname: "Beispiel", rolle: "mitarbeiter" },
    logout: mocks.logout,
  }),
}));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/hooks/useOfflineSync", () => ({ useOfflineSync: () => ({ isOnline: true, offlineCount: 0 }) }));
vi.mock("@/hooks/useSSENotifications", () => ({ useSSENotifications: () => undefined }));
vi.mock("@/hooks/useSessionTimeout", () => ({ useSessionTimeout: () => undefined }));
vi.mock("@/components/OnboardingTour", () => ({
  default: () => null,
  useOnboardingTour: () => ({ show: false, startTour: mocks.startTour, closeTour: vi.fn() }),
}));
vi.mock("@/components/DsgvoErstDialog", () => ({ default: () => null }));
vi.mock("@/components/DsgvoPflichtModal", () => ({ DsgvoPflichtModal: () => null }));
vi.mock("@/components/PasswortwechselPflichtModal", () => ({ PasswortwechselPflichtModal: () => null }));
vi.mock("./Dashboard", () => ({ default: () => <div>Übersicht-Inhalt</div> }));
vi.mock("./Einsatzplanung", () => ({ default: () => <div>Planungs-Inhalt</div> }));

import PortalApp from "./PortalApp";

describe("PortalApp – globaler Rückpfeil", () => {
  it("kehrt von einer Unterseite intern zur Übersicht zurück, ohne eine Browsernavigation auszulösen", async () => {
    const browserBack = vi.spyOn(window.history, "back");
    render(<PortalApp />);

    fireEvent.click(screen.getAllByRole("button", { name: /einsatzplanung/i })[0]);
    await waitFor(() => expect(screen.getByText("Planungs-Inhalt")).toBeTruthy());

    const rueckpfeil = screen.getByRole("button", { name: /vorherigen ansicht zurück/i });
    fireEvent.click(rueckpfeil);

    await waitFor(() => expect(screen.getByText("Übersicht-Inhalt")).toBeTruthy());
    expect(browserBack).not.toHaveBeenCalled();
    browserBack.mockRestore();
  });
});
