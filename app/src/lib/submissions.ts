import { sanitizeFilename } from "./domain";

export function validateFreeName(value: string): string {
  const name = value.trim();
  if (name.length < 3 || name.length > 160) {
    throw new Error("Nama harus terdiri dari 3-160 karakter");
  }
  return name;
}

export function freeSubmissionFilename(submissionKey: string, name: string, extension: string): string {
  return sanitizeFilename(`${submissionKey} - ${name}.${extension}`);
}
