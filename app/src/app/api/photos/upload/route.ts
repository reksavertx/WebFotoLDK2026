import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { getActiveSettings } from "@/lib/settings";
import { processUpload } from "@/lib/storage";
import { validateUploadInput } from "@/lib/submissions";

function createSubmissionKey() {
  return randomUUID().replaceAll("-", "");
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const activeMode = (await getActiveSettings()).mode;
    const requestedMode = form.get("mode");
    if (requestedMode !== null && requestedMode !== activeMode) return Response.json({ error: "Mode upload tidak sesuai." }, { status: 400 });
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Data upload belum lengkap." }, { status: 400 });
    const now = new Date();
    const submissionKey = createSubmissionKey();

    if (activeMode === "free") {
      const { name } = validateUploadInput({ mode: "free", name: form.get("name") });
      const processed = await processUpload(file, submissionKey);
      await db.insert(photoSubmissions).values({ submissionKey, sourceMode: "free", studentId: null, name, className: null, attendanceNumber: null, nis: null, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { submissionKey, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now } });
    } else {
      const { classId, studentId } = validateUploadInput({ mode: "list", classId: form.get("classId"), studentId: form.get("studentId") });
      const [student] = await db.select({ id: students.id, studentId: students.studentId, name: students.name, attendanceNumber: students.attendanceNumber, className: classes.name }).from(students).innerJoin(classes, eq(classes.id, students.classId)).where(and(eq(students.id, studentId), eq(students.classId, classId))).limit(1);
      if (!student) return Response.json({ error: "Nama siswa tidak ditemukan." }, { status: 404 });
      const processed = await processUpload(file, submissionKey);
      await db.insert(photoSubmissions).values({ submissionKey, sourceMode: "list", studentId: student.id, name: student.name, className: student.className, attendanceNumber: student.attendanceNumber, nis: student.studentId, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { submissionKey, name: student.name, className: student.className, attendanceNumber: student.attendanceNumber, nis: student.studentId, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now } });
    }
    return Response.json({ message: "Terimakasih Telah Mensubmit. Foto berhasil diunggah." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload gagal.";
    return Response.json({ error: message }, { status: 400 });
  }
}
