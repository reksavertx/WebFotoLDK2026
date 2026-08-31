import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { photoSubmissions, students } from "@/db/schema";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const classId = Number((await context.params).id);
  if (!Number.isInteger(classId)) return Response.json({ error: "Kelas tidak ditemukan." }, { status: 400 });
  const rows = await db.select({ id: students.id, studentId: students.studentId, name: students.name, attendanceNumber: students.attendanceNumber, status: photoSubmissions.status }).from(students).leftJoin(photoSubmissions, eq(photoSubmissions.studentId, students.id)).where(eq(students.classId, classId)).orderBy(asc(students.attendanceNumber));
  return Response.json(rows.map((row) => ({ ...row, status: row.status ?? "pending" })));
}
