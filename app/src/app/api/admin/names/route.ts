import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { classes, photos, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try { await requireAdmin(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const status = new URL(request.url).searchParams.get("status") === "blur" ? "blur" : "pending";
  const rows = await db.select({ name: students.name, attendance: students.attendanceNumber }).from(students).innerJoin(classes, eq(classes.id, students.classId)).leftJoin(photos, eq(photos.studentId, students.id)).where(status === "pending" ? isNull(photos.id) : eq(photos.status, status)).orderBy(asc(students.classId), asc(students.attendanceNumber));
  return new Response(rows.map((row) => `${String(row.attendance).padStart(2, "0")}. ${row.name}`).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
