import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { photoSubmissions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isResetConfirmation } from "@/lib/reuse";
import { removeStoredFile, storagePath } from "@/lib/storage";

const generatedDir = path.resolve(process.env.GENERATED_DIR ?? path.resolve(process.cwd(), "../data/generated"));

export async function POST(request: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const body = await request.json().catch(() => ({}));
  if (!isResetConfirmation(body.confirmation)) return Response.json({ error: "Ketik HAPUS untuk menghapus semua data foto." }, { status: 400 });

  const rows = await db.select({ storagePath: photoSubmissions.storagePath }).from(photoSubmissions);
  await db.delete(photoSubmissions);
  let deletedUploadFiles = 0;
  const failedFiles: string[] = [];
  for (const storage of new Set(rows.map((row) => row.storagePath))) {
    try { await fs.unlink(storagePath(storage)); deletedUploadFiles += 1; } catch { failedFiles.push(storage); }
  }

  let deletedGeneratedFiles = 0;
  try {
    const entries = await fs.readdir(generatedDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".gitkeep" || !entry.isFile()) continue;
      try { await fs.unlink(path.join(generatedDir, entry.name)); deletedGeneratedFiles += 1; } catch { failedFiles.push(path.join("generated", entry.name)); }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") failedFiles.push("generated");
  }

  return Response.json({ deletedSubmissions: rows.length, deletedUploadFiles, deletedGeneratedFiles, failedFiles });
}
