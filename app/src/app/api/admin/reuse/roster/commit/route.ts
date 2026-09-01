import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, eventSettings, photoSubmissions, students } from "@/db/schema";
import { parseStudentCsv } from "@/lib/domain";
import { requireAdmin } from "@/lib/auth";
import { isRosterConfirmation } from "@/lib/reuse";

export async function POST(request: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const form = await request.formData();
    if (!isRosterConfirmation(form.get("confirmation"))) return Response.json({ error: "Ketik GANTI DATA untuk menerapkan CSV baru." }, { status: 400 });
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "File CSV wajib dipilih." }, { status: 400 });
    const rows = parseStudentCsv(await file.text());
    const existing = await db.select({ id: photoSubmissions.id }).from(photoSubmissions).limit(1);
    if (existing.length) return Response.json({ error: "Hapus semua data foto terlebih dahulu." }, { status: 409 });

    await db.transaction(async (tx) => {
      await tx.delete(classes);
      const classIds = new Map<string, number>();
      for (const row of rows) {
        let classId = classIds.get(row.className);
        if (!classId) {
          await tx.insert(classes).values({ name: row.className });
          const [classRow] = await tx.select({ id: classes.id }).from(classes).where(eq(classes.name, row.className)).limit(1);
          if (!classRow) throw new Error(`Kelas tidak dapat dibuat: ${row.className}`);
          classId = classRow.id;
          classIds.set(row.className, classId);
        }
        await tx.insert(students).values({ studentId: row.studentId, name: row.name, classId, attendanceNumber: row.attendanceNumber, nisn: row.nisn });
      }
      await tx.update(eventSettings).set({ draftMode: "list", activeMode: "list", updatedAt: new Date() }).where(eq(eventSettings.id, 1));
    });
    return Response.json({ count: rows.length, classes: [...new Set(rows.map((row) => row.className))].length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "CSV tidak dapat diterapkan." }, { status: 400 });
  }
}
