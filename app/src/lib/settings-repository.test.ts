import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  row: undefined as Record<string, unknown> | undefined,
  inserted: [] as Record<string, unknown>[],
  duplicateUpdates: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (state.row ? [state.row] : []),
        }),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onDuplicateKeyUpdate: async ({ set }: { set: Record<string, unknown> }) => {
          state.inserted.push(values);
          state.duplicateUpdates.push(set);
          state.row = state.row ? { ...state.row, ...set } : values;
        },
      }),
    }),
    update: () => ({
      set: (set: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(set);
        },
      }),
    }),
  },
}));

import { activateSettings, getSettings, seedDefaultSettings, updateDraftSettings } from "./settings";

describe("settings repository", () => {
  beforeEach(() => {
    state.row = {
      id: 1,
      draftMode: "list",
      draftTitle: "Old draft",
      draftYear: "2025",
      draftDescription: "Old draft description",
      activeMode: "list",
      activeTitle: "Configured live event",
      activeYear: "2024",
      activeDescription: "Configured live description",
    };
    state.inserted.length = 0;
    state.duplicateUpdates.length = 0;
    state.updates.length = 0;
  });

  it("updates draft values while preserving configured active values", async () => {
    await updateDraftSettings({ mode: "free", title: "New draft", year: "2027", description: "New description" });

    expect(await getSettings()).toEqual({
      draft: { mode: "free", title: "New draft", year: "2027", description: "New description" },
      active: { mode: "list", title: "Configured live event", year: "2024", description: "Configured live description" },
    });
  });

  it("uses the id 1 insert path when the settings row does not exist", async () => {
    state.row = undefined;

    await updateDraftSettings({ mode: "list", title: "First event", year: "2026", description: "First description" });

    expect(state.inserted[0]).toMatchObject({ id: 1, draftTitle: "First event", activeTitle: "Pengumpulan Foto LDK" });
    expect((await getSettings()).active).toEqual({
      mode: "list",
      title: "Pengumpulan Foto LDK",
      year: "2026",
      description: "Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026",
    });
  });

  it("sends one update containing every active column for activation", async () => {
    await activateSettings();

    expect(state.updates).toHaveLength(1);
    expect(Object.keys(state.updates[0])).toEqual(["activeMode", "activeTitle", "activeYear", "activeDescription", "updatedAt"]);
  });

  it("preserves a configured row when seeding defaults", async () => {
    const configuredRow = { ...state.row };

    await seedDefaultSettings();

    expect(state.row).toEqual(configuredRow);
    expect(state.duplicateUpdates.at(-1)).toEqual({ id: 1 });
  });
});
