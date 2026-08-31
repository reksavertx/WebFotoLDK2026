import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getActiveSettings } from "@/lib/settings";

export async function GET(request: Request) {
  try { await requireAdmin(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const status = new URL(request.url).searchParams.get("status") === "blur" ? "blur" : "pending";
  const settings = await getActiveSettings();
  if (settings.mode === "free") {
    if (status === "pending") return new Response("", { headers: { "content-type": "text/plain; charset=utf-8" } });
    const rows = await db.select({ name: photoSubmissions.name }).from(photoSubmissions).where(and(eq(photoSubmissions.sourceMode, "free"), eq(photoSubmissions.status, "blur"))).orderBy(asc(photoSubmissions.uploadedAt));
    return new Response(rows.map((row) => row.name).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const rows = await db.select({ name: students.name, attendance: students.attendanceNumber }).from(students).innerJoin(classes, eq(classes.id, students.classId)).leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list"))).where(status === "pending" ? isNull(photoSubmissions.id) : eq(photoSubmissions.status, status)).orderBy(asc(students.classId), asc(students.attendanceNumber));
  return new Response(rows.map((row) => `${String(row.attendance).padStart(2, "0")}. ${row.name}`).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
