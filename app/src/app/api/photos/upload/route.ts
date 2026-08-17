import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { photos, students } from "@/db/schema";
import { processUpload } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const studentId = String(form.get("studentId") ?? "");
    const classId = Number(form.get("classId"));
    const file = form.get("file");
    if (!studentId || !Number.isInteger(classId) || !(file instanceof File)) return Response.json({ error: "Data upload belum lengkap." }, { status: 400 });
    const [student] = await db.select({ id: students.id, studentId: students.studentId }).from(students).where(and(eq(students.id, Number(studentId)), eq(students.classId, classId))).limit(1);
    if (!student) return Response.json({ error: "Nama siswa tidak ditemukan." }, { status: 404 });
    const processed = await processUpload(file, student.studentId);
    const now = new Date();
    await db.insert(photos).values({ studentId: student.id, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now } });
    return Response.json({ message: "Terimakasih Telah Mensubmit. Foto berhasil diunggah." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload gagal.";
    return Response.json({ error: message }, { status: 400 });
  }
}
