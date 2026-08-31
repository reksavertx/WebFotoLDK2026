import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { getActiveSettings } from "@/lib/settings";
import { processUpload, removeStoredFile } from "@/lib/storage";
import { newStoragePathToDelete, replacedStoragePathToDelete, validateUploadInput } from "@/lib/submissions";

function createSubmissionKey() {
  return randomUUID().replaceAll("-", "");
}

async function cleanupReplacedListFile(previousPath: string | null | undefined, nextPath: string, submissionKey: string) {
  if (!previousPath || previousPath === nextPath) return;
  try {
    const [otherSubmission] = await db.select({ id: photoSubmissions.id }).from(photoSubmissions).where(and(eq(photoSubmissions.storagePath, previousPath), ne(photoSubmissions.submissionKey, submissionKey))).limit(1);
    const pathToDelete = replacedStoragePathToDelete(previousPath, nextPath, Boolean(otherSubmission));
    if (pathToDelete) await removeStoredFile(pathToDelete);
  } catch {
    // The replacement is committed; leave the old file when sharing cannot be verified.
  }
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
      let newStoragePath: string | undefined;
      try {
        const processed = await processUpload(file, submissionKey);
        newStoragePath = processed.storagePath;
        await db.insert(photoSubmissions).values({ submissionKey, sourceMode: "free", studentId: null, name, className: null, attendanceNumber: null, nis: null, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { submissionKey, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now } });
      } catch (error) {
        const pathToDelete = newStoragePathToDelete(newStoragePath, null);
        if (pathToDelete) await removeStoredFile(pathToDelete);
        throw error;
      }
    } else {
      const { classId, studentId } = validateUploadInput({ mode: "list", classId: form.get("classId"), studentId: form.get("studentId") });
      const [student] = await db.select({ id: students.id, studentId: students.studentId, name: students.name, attendanceNumber: students.attendanceNumber, className: classes.name, previousStoragePath: photoSubmissions.storagePath }).from(students).innerJoin(classes, eq(classes.id, students.classId)).leftJoin(photoSubmissions, eq(photoSubmissions.studentId, students.id)).where(and(eq(students.id, studentId), eq(students.classId, classId))).limit(1);
      if (!student) return Response.json({ error: "Nama siswa tidak ditemukan." }, { status: 404 });
      let newStoragePath: string | undefined;
      try {
        const processed = await processUpload(file, submissionKey);
        newStoragePath = processed.storagePath;
        await db.insert(photoSubmissions).values({ submissionKey, sourceMode: "list", studentId: student.id, name: student.name, className: student.className, attendanceNumber: student.attendanceNumber, nis: student.studentId, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { submissionKey, name: student.name, className: student.className, attendanceNumber: student.attendanceNumber, nis: student.studentId, storagePath: processed.storagePath, originalFilename: file.name, mimeType: processed.mimeType, fileSize: processed.fileSize, status: "uploaded", uploadedAt: now, updatedAt: now } });
        await cleanupReplacedListFile(student.previousStoragePath, processed.storagePath, submissionKey);
      } catch (error) {
        const pathToDelete = newStoragePathToDelete(newStoragePath, student.previousStoragePath);
        if (pathToDelete) await removeStoredFile(pathToDelete);
        throw error;
      }
    }
    return Response.json({ message: "Terimakasih Telah Mensubmit. Foto berhasil diunggah." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload gagal.";
    return Response.json({ error: message }, { status: 400 });
  }
}
