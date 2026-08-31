import { describe, expect, it } from "vitest";
import { defaultEventSettings, validateEventSettings } from "./settings";

describe("event settings", () => {
  it("keeps the current LDK defaults in list mode", () => {
    expect(defaultEventSettings).toEqual({
      mode: "list",
      title: "Pengumpulan Foto LDK",
      year: "2026",
      description: "Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026",
    });
  });

  it("trims valid settings and treats description as optional", () => {
    expect(validateEventSettings({ title: " Event ", year: "2026" })).toEqual({
      mode: "list",
      title: "Event",
      year: "2026",
      description: "",
    });
  });

  it("rejects an empty event title or year", () => {
    expect(() => validateEventSettings({ title: "", year: "2026", description: "" })).toThrow(/title/i);
    expect(() => validateEventSettings({ title: "Event", year: "", description: "" })).toThrow(/year/i);
  });

  it("rejects unsupported modes and fields beyond storage limits", () => {
    expect(() => validateEventSettings({ mode: "grid", title: "Event", year: "2026", description: "" })).toThrow(/mode/i);
    expect(() => validateEventSettings({ title: "x".repeat(161), year: "2026", description: "" })).toThrow(/title/i);
    expect(() => validateEventSettings({ title: "Event", year: "20260", description: "" })).toThrow(/year/i);
    expect(() => validateEventSettings({ title: "Event", year: "2026", description: "x".repeat(501) })).toThrow(/description/i);
  });
});
