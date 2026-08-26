import { describe, it, expect } from "vitest";
import { zerlegeName } from "./seedAdmin";

describe("zerlegeName", () => {
  it("teilt Vor- und Nachnamen", () => {
    expect(zerlegeName("Daniela Bergmann")).toEqual({ vorname: "Daniela", nachname: "Bergmann" });
  });
  it("mehrteilige Nachnamen bleiben zusammen", () => {
    expect(zerlegeName("Anna von der Heide")).toEqual({ vorname: "Anna", nachname: "von der Heide" });
  });
  it("nur ein Wort -> leerer Nachname", () => {
    expect(zerlegeName("Admin")).toEqual({ vorname: "Admin", nachname: "" });
  });
  it("leer/undefined -> sinnvoller Standard", () => {
    expect(zerlegeName("")).toEqual({ vorname: "Admin", nachname: "Portal" });
    expect(zerlegeName(undefined)).toEqual({ vorname: "Admin", nachname: "Portal" });
    expect(zerlegeName("   ")).toEqual({ vorname: "Admin", nachname: "Portal" });
  });
});
