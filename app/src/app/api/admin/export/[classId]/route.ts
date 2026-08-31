import fs from "node:fs/promises";
import archiver from "archiver";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { exportFilename, photoExportExtension, sanitizeFilename } from "@/lib/domain";
import { getActiveSettings } from "@/lib/settings";
import { freeSubmissionFilename } from "@/lib/submissions";
import { storagePath } from "@/lib/storage";

type ArchiveRow = {
  submissionKey: string;
  name: string;
  className: string | null;
  attendanceNumber: number | null;
  storagePath: string;
  mimeType: string;
};

function safeZipPart(value: string, fallback: string) {
  const sanitized = sanitizeFilename(value);
  return sanitized && sanitized !== "." && sanitized !== ".." ? sanitized : fallback;
}

async function appendFile(archive: archiver.Archiver, row: ArchiveRow, entryName: string) {
  try {
    const file = await fs.readFile(storagePath(row.storagePath));
    archive.append(file, { name: entryName });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    console.error("Failed to read photo export file", { path: row.storagePath, error });
    throw error;
  }
}

async function buildArchive(rows: ArchiveRow[], mode: "list" | "free", allClasses: boolean) {
  const chunks: Buffer[] = [];
  const archive = archiver("zip", { zlib: { level: 9 } });
  let rejectArchiveError: (error: unknown) => void = () => undefined;
  const archiveError = new Promise<never>((_, reject) => { rejectArchiveError = reject; });
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  archive.on("error", rejectArchiveError);
  for (const row of rows) {
    const extension = photoExportExtension(row.mimeType);
    const filename = mode === "free"
      ? freeSubmissionFilename(row.submissionKey, row.name, extension)
      : exportFilename(row.className ?? "Tanpa Kelas", row.attendanceNumber ?? 0, row.name, extension);
    const entryName = allClasses && mode === "list"
      ? `${safeZipPart(row.className ?? "", "Tanpa Kelas")}/${filename}`
      : filename;
    await appendFile(archive, row, entryName);
  }
  await Promise.race([archive.finalize(), archiveError]);
  // Buffering is retained for Next.js compatibility; school-sized archives fit the existing response model.
  return Buffer.concat(chunks);
}

export async function GET(_: Request, context: { params: Promise<{ classId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getActiveSettings();
  const classIdParam = (await context.params).classId;
  let rows: ArchiveRow[];
  let filename: string;

  if (settings.mode === "free") {
    rows = await db
      .select({ submissionKey: photoSubmissions.submissionKey, name: photoSubmissions.name, className: photoSubmissions.className, attendanceNumber: photoSubmissions.attendanceNumber, storagePath: photoSubmissions.storagePath, mimeType: photoSubmissions.mimeType })
      .from(photoSubmissions)
      .where(eq(photoSubmissions.sourceMode, "free"))
      .orderBy(asc(photoSubmissions.uploadedAt), asc(photoSubmissions.submissionKey));
    filename = "Semua Foto.zip";
  } else if (classIdParam === "all") {
    rows = await db
      .select({ submissionKey: photoSubmissions.submissionKey, name: photoSubmissions.name, className: photoSubmissions.className, attendanceNumber: photoSubmissions.attendanceNumber, storagePath: photoSubmissions.storagePath, mimeType: photoSubmissions.mimeType })
      .from(photoSubmissions)
      .where(eq(photoSubmissions.sourceMode, "list"))
      .orderBy(asc(photoSubmissions.className), asc(photoSubmissions.attendanceNumber));
    filename = "Semua Kelas.zip";
  } else {
    const classId = Number(classIdParam);
    const [classRow] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
    if (!classRow) return Response.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
    rows = await db
      .select({ submissionKey: photoSubmissions.submissionKey, name: photoSubmissions.name, className: photoSubmissions.className, attendanceNumber: photoSubmissions.attendanceNumber, storagePath: photoSubmissions.storagePath, mimeType: photoSubmissions.mimeType })
      .from(photoSubmissions)
      .innerJoin(students, eq(photoSubmissions.studentId, students.id))
      .where(and(eq(photoSubmissions.sourceMode, "list"), eq(students.classId, classId)))
      .orderBy(asc(photoSubmissions.attendanceNumber));
    filename = `${safeZipPart(classRow.name, "kelas")}.zip`;
  }

  const buffer = await buildArchive(rows, settings.mode, classIdParam === "all");
  return new Response(buffer, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${filename}"` } });
}
