export function isResetConfirmation(value: unknown): value is "HAPUS" {
  return value === "HAPUS";
}

export function isRosterConfirmation(value: unknown): value is "GANTI DATA" {
  return value === "GANTI DATA";
}
