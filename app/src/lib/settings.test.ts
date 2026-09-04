import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  row: {
    id: 1,
    draftMode: "free",
    draftTitle: "Draft event",
    draftYear: "2027",
    draftDescription: "Draft description",
    activeMode: "list",
    activeTitle: "Live event",
    activeYear: "2026",
    activeDescription: "Live description",
  },
  existingSubmissions: [{ submissionKey: "existing-photo" }],
  selectedTables: [] as unknown[],
  updateSets: [] as Record<string, unknown>[],
  deleteCalls: 0,
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        repository.selectedTables.push(table);
        if (table === photoSubmissions) return { where: () => ({ limit: async () => repository.existingSubmissions }) };
        return { where: () => ({ limit: async () => [repository.row] }) };
      },
    }),
    update: () => ({
      set: (set: Record<string, unknown>) => ({
        where: async () => {
          repository.updateSets.push(set);
          repository.row = {
            ...repository.row,
            activeMode: repository.row.draftMode,
            activeTitle: repository.row.draftTitle,
            activeYear: repository.row.draftYear,
            activeDescription: repository.row.draftDescription,
          };
        },
      }),
    }),
    delete: () => {
      repository.deleteCalls += 1;
      throw new Error("activation must not delete submissions");
    },
  },
}));

import {
  activateSettings,
  applyDraftToActive,
  buildDraftUpdate,
  defaultEventSettings,
  defaultSettingsRow,
  mapActiveSettings,
  validateEventSettings,
} from "./settings";
import { eventSettings, photoSubmissions } from "@/db/schema";

describe("event settings", () => {
  beforeEach(() => {
    repository.row = {
      id: 1,
      draftMode: "free",
      draftTitle: "Draft event",
      draftYear: "2027",
      draftDescription: "Draft description",
      activeMode: "list",
      activeTitle: "Live event",
      activeYear: "2026",
      activeDescription: "Live description",
    };
    repository.selectedTables.length = 0;
    repository.updateSets.length = 0;
    repository.deleteCalls = 0;
  });

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

  it("activates settings without changing existing submissions", async () => {
    const active = await activateSettings();

    expect(repository.existingSubmissions).toEqual([{ submissionKey: "existing-photo" }]);
    expect(active).toEqual({ mode: "free", title: "Draft event", year: "2027", description: "Draft description" });
    expect(repository.row).toMatchObject({
      draftMode: "free",
      draftTitle: "Draft event",
      draftYear: "2027",
      draftDescription: "Draft description",
      activeMode: "free",
      activeTitle: "Draft event",
      activeYear: "2027",
      activeDescription: "Draft description",
    });
    expect(repository.selectedTables).toEqual([eventSettings]);
    expect(repository.updateSets).toHaveLength(1);
    expect(Object.keys(repository.updateSets[0])).toEqual(["activeMode", "activeTitle", "activeYear", "activeDescription", "updatedAt"]);
    expect(repository.deleteCalls).toBe(0);
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
