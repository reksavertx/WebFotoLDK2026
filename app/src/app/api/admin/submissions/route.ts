import { and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildSubmissionStats } from "@/lib/dashboard";
import { getActiveSettings } from "@/lib/settings";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getActiveSettings();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const classId = Number(url.searchParams.get("classId") ?? 0);
  const search = url.searchParams.get("search")?.trim() ?? "";

  if (settings.mode === "free") {
    const filters = [eq(photoSubmissions.sourceMode, "free")];
    if (status === "uploaded" || status === "blur") filters.push(eq(photoSubmissions.status, status));
    if (search) filters.push(like(photoSubmissions.name, `%${search}%`));

    const rows = status === "pending" ? [] : await db
      .select({ submissionKey: photoSubmissions.submissionKey, photoId: photoSubmissions.id, name: photoSubmissions.name, status: photoSubmissions.status, uploadedAt: photoSubmissions.uploadedAt })
      .from(photoSubmissions)
      .where(and(...filters))
      .orderBy(asc(photoSubmissions.uploadedAt), asc(photoSubmissions.submissionKey));
    const [overall] = await db
      .select({
        total: sql<number>`count(*)`,
        uploaded: sql<number>`sum(case when ${photoSubmissions.status} = 'uploaded' then 1 else 0 end)`,
        blur: sql<number>`sum(case when ${photoSubmissions.status} = 'blur' then 1 else 0 end)`,
      })
      .from(photoSubmissions)
      .where(eq(photoSubmissions.sourceMode, "free"));
    const stats = buildSubmissionStats({ total: Number(overall?.total ?? 0), uploaded: Number(overall?.uploaded ?? 0), blur: Number(overall?.blur ?? 0), pending: 0 });
    return Response.json({ mode: settings.mode, settings, rows, stats });
  }

  const rowFilters = [];
  if (Number.isInteger(classId) && classId > 0) rowFilters.push(eq(students.classId, classId));
  if (status === "pending") rowFilters.push(isNull(photoSubmissions.id));
  if (status === "uploaded" || status === "blur") rowFilters.push(eq(photoSubmissions.status, status));
  if (search) rowFilters.push(or(like(students.name, `%${search}%`), like(students.studentId, `%${search}%`))!);

  const rows = await db
    .select({
      submissionKey: photoSubmissions.submissionKey,
      studentId: students.studentId,
      nis: students.studentId,
      name: students.name,
      className: classes.name,
      attendanceNumber: students.attendanceNumber,
      status: photoSubmissions.status,
      uploadedAt: photoSubmissions.uploadedAt,
      photoId: photoSubmissions.id,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list")))
    .where(and(...rowFilters))
    .orderBy(asc(students.classId), asc(students.attendanceNumber));
  const [overall] = await db
    .select({
      total: sql<number>`count(*)`,
      uploaded: sql<number>`sum(case when ${photoSubmissions.status} = 'uploaded' then 1 else 0 end)`,
      blur: sql<number>`sum(case when ${photoSubmissions.status} = 'blur' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${photoSubmissions.id} is null then 1 else 0 end)`,
    })
    .from(students)
    .leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list")));
  const byClass = await db
    .select({
      className: classes.name,
      total: sql<number>`count(*)`,
      submitted: sql<number>`sum(case when ${photoSubmissions.status} in ('uploaded', 'blur') then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${photoSubmissions.id} is null then 1 else 0 end)`,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list")))
    .groupBy(classes.id, classes.name)
    .orderBy(asc(classes.id));
  const stats = buildSubmissionStats({
    total: Number(overall?.total ?? 0),
    uploaded: Number(overall?.uploaded ?? 0),
    blur: Number(overall?.blur ?? 0),
    pending: Number(overall?.pending ?? 0),
    byClass: byClass.map((row) => ({ className: row.className, total: Number(row.total), submitted: Number(row.submitted), pending: Number(row.pending) })),
  });
  return Response.json({ mode: settings.mode, settings, rows: rows.map((row) => ({ ...row, status: row.status ?? "pending" })), stats });
}
