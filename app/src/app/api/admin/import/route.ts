import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parseStudentCsv } from "@/lib/domain";

export async function POST(request: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return Response.json({ error: "File CSV wajib dipilih." }, { status: 400 });
    const rows = parseStudentCsv(await file.text());
    if (form.get("commit") !== "true") return Response.json({ preview: rows.slice(0, 10), total: rows.length });
    await db.transaction(async (tx) => { const ids = new Map<string, number>(); for (const row of rows) { let classId = ids.get(row.className); if (!classId) { await tx.insert(classes).values({ name: row.className }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } }); const [classRow] = await tx.select({ id: classes.id }).from(classes).where(eq(classes.name, row.className)).limit(1); if (!classRow) throw new Error(`Class not found after upsert: ${row.className}`); classId = classRow.id; ids.set(row.className, classId); } await tx.insert(students).values({ studentId: row.studentId, name: row.name, classId, attendanceNumber: row.attendanceNumber, nisn: row.nisn }).onDuplicateKeyUpdate({ set: { name: row.name, classId, attendanceNumber: row.attendanceNumber, nisn: row.nisn, updatedAt: new Date() } }); } });
    return Response.json({ message: `${rows.length} data siswa berhasil diimport.` });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Import gagal." }, { status: 400 }); }
}
