export type FormMode = "list" | "free";
export type SubmissionStatus = "uploaded" | "blur";
export type PhotoStatus = "pending" | "uploaded" | "blur";

export function transitionStatus(current: PhotoStatus, action: "blur" | "valid" | "upload"): PhotoStatus {
  if (action === "blur") return "blur";
  if (action === "valid") return current === "blur" ? "uploaded" : current;
  return "uploaded";
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim();
}

export function exportFilename(className: string, attendance: number, name: string, ext: string): string {
  return sanitizeFilename(`${className} - ${String(attendance).padStart(2, "0")} - ${name}.${ext}`);
}

export function validateImageSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}

export function parseStudentCsv(csv: string) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length || lines[0].trim() !== "NO,NIS,NISN,NAMA,KELAS") throw new Error("Header CSV tidak valid");
  const students = lines.slice(1).map((line, index) => {
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length !== 5 || !parts[1] || !parts[3] || !parts[4]) throw new Error(`Baris CSV ${index + 2} tidak valid`);
    const attendance = Number(parts[0]);
    if (!Number.isInteger(attendance) || attendance < 1) throw new Error(`Nomor absen baris ${index + 2} tidak valid`);
    return { attendanceNumber: attendance, studentId: parts[1], nisn: parts[2], name: parts[3], className: parts[4] };
  });
  const ids = new Set<string>();
  const seats = new Set<string>();
  for (const student of students) {
    if (ids.has(student.studentId)) throw new Error(`Student ID duplikat: ${student.studentId}`);
    const seat = `${student.className}:${student.attendanceNumber}`;
    if (seats.has(seat)) throw new Error(`Nomor absen duplikat: ${seat}`);
    ids.add(student.studentId);
    seats.add(seat);
  }
  return students;
}

export function photoExportExtension(mimeType: string): "jpg" | "webp" {
  return mimeType === "image/webp" ? "webp" : "jpg";
}
