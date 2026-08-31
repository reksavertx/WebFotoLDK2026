import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { eventSettings } from "../db/schema";
import { freeSubmissionFilename, validateFreeName } from "./submissions";

const migrationSql = readFileSync(new URL("../db/migrations/0001_reusable_photo_web.sql", import.meta.url), "utf8");
const migrationSnapshot = JSON.parse(readFileSync(new URL("../db/migrations/meta/0001_snapshot.json", import.meta.url), "utf8"));

describe("reusable photo submission domain", () => {
  it("validates and trims a free-form name", () => {
    expect(validateFreeName("  Budi Santoso  ")).toBe("Budi Santoso");
    expect(() => validateFreeName("ab")).toThrow();
  });

  it("creates a collision-safe free submission filename", () => {
    expect(freeSubmissionFilename("01HABC", "Budi/A", "jpg")).toBe("01HABC - Budi_A.jpg");
  });

  it("keeps the generic schema and migration aligned", () => {
    expect(schema).not.toHaveProperty("photos");
    expect(migrationSql.match(/CREATE TABLE `photo_submissions`/g)).toHaveLength(1);
    expect(migrationSql.match(/DROP TABLE `photos`/g)).toHaveLength(1);
    expect(migrationSnapshot.tables).not.toHaveProperty("photos");
  });

  it("initializes event settings as the id 1 singleton", () => {
    expect(eventSettings.id.default).toBe(1);
    expect(eventSettings.id.primary).toBe(true);
    expect(migrationSql).toContain("`id` int NOT NULL DEFAULT 1");
    expect(migrationSql).toContain(
      "INSERT INTO `event_settings` (`id`, `draft_mode`, `active_mode`, `draft_title`, `active_title`, `draft_year`, `active_year`, `draft_description`, `active_description`) VALUES (1, 'list', 'list', 'Pengumpulan Foto LDK', 'Pengumpulan Foto LDK', '2026', '2026', 'Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026', 'Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026')",
    );
  });
});
