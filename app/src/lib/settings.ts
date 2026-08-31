import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventSettings } from "@/db/schema";
import type { FormMode } from "./domain";

export type EventSettings = {
  mode: FormMode;
  title: string;
  year: string;
  description: string;
};

export const defaultEventSettings: EventSettings = {
  mode: "list" as FormMode,
  title: "Pengumpulan Foto LDK",
  year: "2026",
  description: "Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026",
};

export class SettingsValidationError extends Error {}

export function validateEventSettings(value: unknown): EventSettings {
  if (!value || typeof value !== "object") throw new SettingsValidationError("Settings payload must be an object.");
  const input = value as Record<string, unknown>;
  const mode = input.mode ?? defaultEventSettings.mode;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const year = typeof input.year === "string" ? input.year.trim() : "";
  const description = input.description === undefined ? "" : typeof input.description === "string" ? input.description.trim() : "";

  if (mode !== "list" && mode !== "free") throw new SettingsValidationError("Mode must be list or free.");
  if (!title) throw new SettingsValidationError("Title is required.");
  if (title.length > 160) throw new SettingsValidationError("Title must be 160 characters or fewer.");
  if (!year) throw new SettingsValidationError("Year is required.");
  if (year.length > 4) throw new SettingsValidationError("Year must be 4 characters or fewer.");
  if (input.description !== undefined && typeof input.description !== "string") throw new SettingsValidationError("Description must be text.");
  if (description.length > 500) throw new SettingsValidationError("Description must be 500 characters or fewer.");

  return { mode, title, year, description };
}

function mapActiveSettings(row: typeof eventSettings.$inferSelect): EventSettings {
  return { mode: row.activeMode, title: row.activeTitle, year: row.activeYear, description: row.activeDescription };
}

function mapDraftSettings(row: typeof eventSettings.$inferSelect): EventSettings {
  return { mode: row.draftMode, title: row.draftTitle, year: row.draftYear, description: row.draftDescription };
}

async function selectSettingsRow() {
  const [row] = await db.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);
  return row;
}

export async function getActiveSettings(): Promise<EventSettings> {
  const row = await selectSettingsRow();
  return row ? mapActiveSettings(row) : defaultEventSettings;
}

export async function getSettings(): Promise<{ draft: EventSettings; active: EventSettings }> {
  const row = await selectSettingsRow();
  return row ? { draft: mapDraftSettings(row), active: mapActiveSettings(row) } : { draft: defaultEventSettings, active: defaultEventSettings };
}

export async function updateDraftSettings(value: unknown): Promise<EventSettings> {
  const settings = validateEventSettings(value);
  await db
    .insert(eventSettings)
    .values({
      id: 1,
      draftMode: settings.mode,
      activeMode: defaultEventSettings.mode,
      draftTitle: settings.title,
      activeTitle: defaultEventSettings.title,
      draftYear: settings.year,
      activeYear: defaultEventSettings.year,
      draftDescription: settings.description,
      activeDescription: defaultEventSettings.description,
    })
    .onDuplicateKeyUpdate({
      set: {
        draftMode: settings.mode,
        draftTitle: settings.title,
        draftYear: settings.year,
        draftDescription: settings.description,
        updatedAt: new Date(),
      },
    });
  return settings;
}

export async function activateSettings(): Promise<EventSettings> {
  await db
    .update(eventSettings)
    .set({
      activeMode: sql`${eventSettings.draftMode}`,
      activeTitle: sql`${eventSettings.draftTitle}`,
      activeYear: sql`${eventSettings.draftYear}`,
      activeDescription: sql`${eventSettings.draftDescription}`,
      updatedAt: new Date(),
    })
    .where(eq(eventSettings.id, 1));
  return getActiveSettings();
}
