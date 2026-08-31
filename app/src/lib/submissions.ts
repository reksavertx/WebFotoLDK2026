import { sanitizeFilename } from "./domain";
import type { FormMode } from "./domain";

export function validateFreeName(value: string): string {
  const name = value.trim();
  if (name.length < 3 || name.length > 160) {
    throw new Error("Nama harus terdiri dari 3-160 karakter");
  }
  return name;
}

export function validateUploadInput(input: { mode: "free"; name?: unknown; classId?: unknown; studentId?: unknown }): { name: string };
export function validateUploadInput(input: { mode: "list"; name?: unknown; classId?: unknown; studentId?: unknown }): { classId: number; studentId: number };
export function validateUploadInput(input: {
  mode: FormMode;
  name?: unknown;
  classId?: unknown;
  studentId?: unknown;
}): { name: string } | { classId: number; studentId: number };
export function validateUploadInput(input: {
  mode: FormMode;
  name?: unknown;
  classId?: unknown;
  studentId?: unknown;
}) {
  if (input.mode === "free") {
    if (typeof input.name !== "string") throw new Error("Nama wajib diisi.");
    return { name: validateFreeName(input.name) };
  }

  const classId = Number(input.classId);
  const studentId = Number(input.studentId);
  if (!Number.isInteger(classId) || classId < 1 || !Number.isInteger(studentId) || studentId < 1) {
    throw new Error("Kelas dan nama siswa wajib dipilih.");
  }
  return { classId, studentId };
}

export function freeSubmissionFilename(submissionKey: string, name: string, extension: string): string {
  return sanitizeFilename(`${submissionKey} - ${name}.${extension}`);
}
