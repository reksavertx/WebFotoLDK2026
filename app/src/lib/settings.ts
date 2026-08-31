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

export type SettingsRow = {
  draftMode: FormMode;
  draftTitle: string;
  draftYear: string;
  draftDescription: string;
  activeMode: FormMode;
  activeTitle: string;
  activeYear: string;
  activeDescription: string;
};

export const defaultEventSettings: EventSettings = {
  mode: "list" as FormMode,
  title: "Pengumpulan Foto LDK",
  year: "2026",
  description: "Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026",
};

export class SettingsValidationError extends Error {}

export function mapActiveSettings(row: SettingsRow): EventSettings {
  return { mode: row.activeMode, title: row.activeTitle, year: row.activeYear, description: row.activeDescription };
}

export function buildDraftUpdate(settings: EventSettings) {
  return {
    draftMode: settings.mode,
    draftTitle: settings.title,
    draftYear: settings.year,
    draftDescription: settings.description,
  };
}

export function applyDraftToActive<TMode, TText>(row: {
  draftMode: TMode;
  draftTitle: TText;
  draftYear: TText;
  draftDescription: TText;
  activeMode?: unknown;
  activeTitle?: unknown;
  activeYear?: unknown;
  activeDescription?: unknown;
}) {
  return {
    activeMode: row.draftMode,
    activeTitle: row.draftTitle,
    activeYear: row.draftYear,
    activeDescription: row.draftDescription,
  };
}

export function defaultSettingsRow(): SettingsRow & { id: 1 } {
  return {
    id: 1,
    draftMode: defaultEventSettings.mode,
    activeMode: defaultEventSettings.mode,
    draftTitle: defaultEventSettings.title,
    activeTitle: defaultEventSettings.title,
    draftYear: defaultEventSettings.year,
    activeYear: defaultEventSettings.year,
    draftDescription: defaultEventSettings.description,
    activeDescription: defaultEventSettings.description,
  };
}

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

function mapDraftSettings(row: SettingsRow): EventSettings {
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
      ...defaultSettingsRow(),
      ...buildDraftUpdate(settings),
    })
    .onDuplicateKeyUpdate({
      set: {
        ...buildDraftUpdate(settings),
        updatedAt: new Date(),
      },
    });
  return settings;
}

export async function activateSettings(): Promise<EventSettings> {
  await db
    .update(eventSettings)
    .set({
      ...applyDraftToActive({
        draftMode: sql`${eventSettings.draftMode}`,
        draftTitle: sql`${eventSettings.draftTitle}`,
        draftYear: sql`${eventSettings.draftYear}`,
        draftDescription: sql`${eventSettings.draftDescription}`,
      }),
      updatedAt: new Date(),
    })
    .where(eq(eventSettings.id, 1));
  return getActiveSettings();
}

type SettingsDatabase = Pick<typeof db, "insert">;

export async function seedDefaultSettings(database: SettingsDatabase = db) {
  await database.insert(eventSettings).values(defaultSettingsRow()).onDuplicateKeyUpdate({ set: { id: 1 } });
}
