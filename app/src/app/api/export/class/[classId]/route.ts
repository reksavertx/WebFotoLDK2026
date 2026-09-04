import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { appPath } from "@/lib/paths";

export async function GET(request: Request, context: { params: Promise<{ classId: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const classId = Number((await context.params).classId); const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const [classRow] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
  if (!classRow) return Response.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  const rows = await db.select({ studentId: students.studentId, name: students.name, attendance: students.attendanceNumber, photoPath: photoSubmissions.storagePath }).from(students).leftJoin(photoSubmissions, eq(photoSubmissions.studentId, students.id)).where(eq(students.classId, classId)).orderBy(asc(students.attendanceNumber));
  const data = rows.map((row) => ({ student_id: row.studentId, name: row.name, attendance: row.attendance, class: classRow.name, photo_url: row.photoPath ? appPath(`/api/photos/${row.studentId}`) : null }));
  if (format === "csv") { const csv = ["student_id,name,attendance,class,photo_url", ...data.map((row) => [row.student_id, row.name, row.attendance, row.class, row.photo_url ?? ""].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n"); return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${classRow.name}.csv"` } }); }
  return Response.json({ class: classRow.name, students: data });
}
