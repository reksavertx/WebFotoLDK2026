export function normalizeLoginUsername(value: string): string {
  return value.trim();
}

export function getLoginError(data: unknown): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error) return data.error;
  return "Login tidak dapat diproses. Periksa koneksi dan server.";
}
