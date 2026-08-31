import { describe, expect, it } from "vitest";
import {
  applyDraftToActive,
  buildDraftUpdate,
  defaultEventSettings,
  defaultSettingsRow,
  mapActiveSettings,
  validateEventSettings,
} from "./settings";

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

  it("maps only active columns to the public settings shape", () => {
    expect(mapActiveSettings({
      draftMode: "list",
      draftTitle: "Draft",
      draftYear: "2027",
      draftDescription: "Draft description",
      activeMode: "free",
      activeTitle: "Live event",
      activeYear: "2026",
      activeDescription: "Live description",
    })).toEqual({
      mode: "free",
      title: "Live event",
      year: "2026",
      description: "Live description",
    });
  });

  it("builds a draft-only update without active fields", () => {
    const update = buildDraftUpdate({ mode: "free", title: "Draft", year: "2027", description: "Draft description" });

    expect(update).toEqual({
      draftMode: "free",
      draftTitle: "Draft",
      draftYear: "2027",
      draftDescription: "Draft description",
    });
    expect(update).not.toHaveProperty("activeMode");
    expect(update).not.toHaveProperty("activeTitle");
    expect(update).not.toHaveProperty("activeYear");
    expect(update).not.toHaveProperty("activeDescription");
  });

  it("copies every draft field when activating settings", () => {
    expect(applyDraftToActive({
      draftMode: "free",
      draftTitle: "Draft",
      draftYear: "2027",
      draftDescription: "Draft description",
      activeMode: "list",
      activeTitle: "Old live event",
      activeYear: "2026",
      activeDescription: "Old live description",
    })).toEqual({
      activeMode: "free",
      activeTitle: "Draft",
      activeYear: "2027",
      activeDescription: "Draft description",
    });
  });

  it("uses current LDK defaults for a new settings row", () => {
    expect(defaultSettingsRow()).toEqual({
      id: 1,
      draftMode: defaultEventSettings.mode,
      activeMode: defaultEventSettings.mode,
      draftTitle: defaultEventSettings.title,
      activeTitle: defaultEventSettings.title,
      draftYear: defaultEventSettings.year,
      activeYear: defaultEventSettings.year,
      draftDescription: defaultEventSettings.description,
      activeDescription: defaultEventSettings.description,
    });
  });
});
