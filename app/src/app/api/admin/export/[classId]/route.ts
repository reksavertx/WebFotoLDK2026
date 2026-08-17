import fs from "node:fs/promises";
import archiver from "archiver";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, photos, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { exportFilename, photoExportExtension, sanitizeFilename } from "@/lib/domain";
import { storagePath } from "@/lib/storage";

export async function GET(_: Request, context: { params: Promise<{ classId: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const classIdParam = (await context.params).classId;
  const chunks: Buffer[] = [];
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  if (classIdParam === "all") {
    const classRows = await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(asc(classes.id));
    for (const classRow of classRows) {
      const folder = sanitizeFilename(classRow.name);
      const rows = await db.select({ name: students.name, attendance: students.attendanceNumber, storagePath: photos.storagePath, mimeType: photos.mimeType }).from(students).leftJoin(photos, eq(photos.studentId, students.id)).where(eq(students.classId, classRow.id)).orderBy(asc(students.attendanceNumber));
      for (const row of rows) if (row.storagePath) {
        try { const file = await fs.readFile(storagePath(row.storagePath)); archive.append(file, { name: `${folder}/${exportFilename(classRow.name, row.attendance, row.name, photoExportExtension(row.mimeType ?? "image/jpeg"))}` }); } catch { /* missing files are skipped */ }
      }
    }
    await archive.finalize();
    return new Response(Buffer.concat(chunks), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="Semua Kelas.zip"` } });
  }

  const classId = Number(classIdParam);
  const [classRow] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
  if (!classRow) return Response.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  const rows = await db.select({ name: students.name, attendance: students.attendanceNumber, storagePath: photos.storagePath, mimeType: photos.mimeType }).from(students).leftJoin(photos, eq(photos.studentId, students.id)).where(eq(students.classId, classId)).orderBy(asc(students.attendanceNumber));
  for (const row of rows) if (row.storagePath) {
    try { const file = await fs.readFile(storagePath(row.storagePath)); archive.append(file, { name: exportFilename(classRow.name, row.attendance, row.name, photoExportExtension(row.mimeType ?? "image/jpeg")) }); } catch { /* missing files are skipped */ }
  }
  await archive.finalize();
  return new Response(Buffer.concat(chunks), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${sanitizeFilename(classRow.name)}.zip"` } });
}
