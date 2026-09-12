import { appPath } from "./paths";
import type { PublicStatus } from "./public-status";

export const examplePhotoDimensions = { width: 1122, height: 1402 } as const;

export function publicStatusApiPath(basePath?: string): string {
  return appPath("/api/status", basePath);
}

export function examplePhotoPath(kind: "good" | "bad", basePath?: string): string {
  return appPath(kind === "good" ? "/contoh-foto-benar.png" : "/contoh-foto-salah.png", basePath);
}

export function publicStatusLabel(status: PublicStatus): string {
  return status === "uploaded" ? "Sudah upload" : status === "blur" ? "Foto blur" : "Belum upload";
}
