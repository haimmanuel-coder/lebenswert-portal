// @vitest-environment jsdom
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EinstellungenTab from "./EinstellungenTab";

const mocks = vi.hoisted(() => ({
  refetchExport: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    einstellungen: {
      getAll: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      set: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      testSteuerberaterMail: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    export: {
      personalaktenHistorie: { useQuery: () => ({ refetch: mocks.refetchExport, isFetching: false }) },
    },
    admin: {
      mitarbeiterList: { useQuery: () => ({ data: [] }) },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

describe("Personalaktenexport im Einstellungsbereich", () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.refetchExport.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.refetchExport.mockResolvedValue({
      data: {
        csv: "Mitarbeiter;Arbeitsmuster\nErika Beispiel;Mo,Mi,Fr",
        dateiName: "personalakten-historie-2026-08-31.csv",
        zeilen: 2,
      },
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:personalaktenexport"),
      revokeObjectURL: vi.fn(),
    });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => clickSpy.mockRestore());

  it("zeigt nach dem Export eine sichtbare Downloadkarte mit Dateiname und Ersatzdownload", async () => {
    render(<EinstellungenTab />);

    fireEvent.click(screen.getByRole("button", { name: /arbeitsmuster.*urlaubshistorie/i }));

    await waitFor(() => {
      expect(screen.getByText(/datei bereit:/i).textContent).toContain("personalakten-historie-2026-08-31.csv");
    });
    const download = screen.getByRole("link", { name: /csv jetzt herunterladen/i });
    expect(download.getAttribute("download")).toBe("personalakten-historie-2026-08-31.csv");
    expect(download.getAttribute("href")).toBe("blob:personalaktenexport");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith(expect.stringContaining("personalakten-historie-2026-08-31.csv"));
  });
});
