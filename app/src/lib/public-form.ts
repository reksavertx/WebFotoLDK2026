export type FormMode = "list" | "free";
export type PublicSettings = { mode: FormMode; title: string; year: string; description: string };
export type StudentRow = { id: number; name: string; attendanceNumber: number; status: string };

export function parseActiveSettings(value: unknown): PublicSettings {
  if (!value || typeof value !== "object") throw new Error("Pengaturan aktif tidak valid.");
  const input = value as Record<string, unknown>;
  if ((input.mode !== "list" && input.mode !== "free") || typeof input.title !== "string" || typeof input.year !== "string" || typeof input.description !== "string") {
    throw new Error("Pengaturan aktif tidak valid.");
  }
  return { mode: input.mode, title: input.title, year: input.year, description: input.description };
}

export function parseStudentRows(value: unknown): StudentRow[] {
  if (!Array.isArray(value)) throw new Error("Daftar siswa tidak valid.");
  return value as StudentRow[];
}
