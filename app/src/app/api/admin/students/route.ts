import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { buildDashboardStats } from "@/lib/dashboard";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const url = new URL(request.url); const classId = Number(url.searchParams.get("classId") ?? 0); const status = url.searchParams.get("status") ?? "all"; const search = url.searchParams.get("search")?.trim() ?? "";
  const filters = [];
  if (classId) filters.push(eq(students.classId, classId));
  if (status === "pending") filters.push(isNull(photoSubmissions.id));
  if (status === "uploaded" || status === "blur") filters.push(eq(photoSubmissions.status, status));
  if (search) filters.push(or(ilike(students.name, `%${search}%`), ilike(students.studentId, `%${search}%`))!);
  const rows = await db.select({ id: students.id, studentId: students.studentId, name: students.name, attendanceNumber: students.attendanceNumber, className: classes.name, status: photoSubmissions.status, uploadedAt: photoSubmissions.uploadedAt, photoId: photoSubmissions.id }).from(students).innerJoin(classes, eq(classes.id, students.classId)).leftJoin(photoSubmissions, eq(photoSubmissions.studentId, students.id)).where(filters.length ? and(...filters) : undefined).orderBy(asc(students.classId), asc(students.attendanceNumber));
  const overall = await db.select({ total: sql<number>`count(*)`, uploaded: sql<number>`sum(case when ${photoSubmissions.status} = 'uploaded' then 1 else 0 end)`, blur: sql<number>`sum(case when ${photoSubmissions.status} = 'blur' then 1 else 0 end)` }).from(students).leftJoin(photoSubmissions, eq(photoSubmissions.studentId, students.id));
  const byClass = await db.select({ className: classes.name, total: sql<number>`count(*)`, pending: sql<number>`sum(case when ${photoSubmissions.id} is null then 1 else 0 end)` }).from(students).innerJoin(classes, eq(classes.id, students.classId)).leftJoin(photoSubmissions, eq(photoSubmissions.studentId, students.id)).groupBy(classes.id, classes.name).orderBy(asc(classes.id));
  const stats = buildDashboardStats({
    total: Number(overall[0]?.total ?? 0),
    uploaded: Number(overall[0]?.uploaded ?? 0),
    blur: Number(overall[0]?.blur ?? 0),
    pendingByClass: byClass.map((row) => ({ className: row.className, total: Number(row.total), pending: Number(row.pending) })),
  });
  return Response.json({ rows: rows.map((row) => ({ ...row, status: row.status ?? "pending" })), stats });
}
