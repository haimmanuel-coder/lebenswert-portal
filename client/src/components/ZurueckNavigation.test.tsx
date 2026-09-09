// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZurueckNavigation } from "./ZurueckNavigation";

describe("ZurueckNavigation", () => {
  afterEach(() => cleanup());

  it("ist eindeutig beschriftet, groß genug für Touch und löst nur die interne Rückaktion aus", () => {
    const onZurueck = vi.fn();
    render(<ZurueckNavigation onZurueck={onZurueck} />);

    const button = screen.getByRole("button", { name: /vorherigen ansicht zurück/i });
    expect(button.style.minHeight).toBe("40px");
    expect(button.textContent).toContain("Zurück");
    fireEvent.click(button);
    expect(onZurueck).toHaveBeenCalledTimes(1);
  });

  it("bleibt in der mobilen Kopfzeile als kompakter 40-Pixel-Touchbutton erreichbar", () => {
    render(<ZurueckNavigation onZurueck={vi.fn()} kompakt />);

    const button = screen.getByRole("button", { name: /vorherigen ansicht zurück/i });
    expect(button.style.minWidth).toBe("40px");
    expect(button.style.minHeight).toBe("40px");
    expect(button.textContent).not.toContain("Zurück");
  });
});
