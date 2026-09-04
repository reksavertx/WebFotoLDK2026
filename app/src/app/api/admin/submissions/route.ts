import { and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildSubmissionStats, groupSubmissionRows, normalizeDashboardView, type DashboardView, type SubmissionRow } from "@/lib/dashboard";
import { getActiveSettings } from "@/lib/settings";

type DashboardStatus = "all" | "pending" | "uploaded" | "blur";

function normalizeStatus(value: string | null): DashboardStatus {
  return value === "pending" || value === "uploaded" || value === "blur" ? value : "all";
}

function listFilters(status: DashboardStatus, classId: number, search: string) {
  const filters = [];
  if (Number.isInteger(classId) && classId > 0) filters.push(eq(students.classId, classId));
  if (status === "pending") filters.push(isNull(photoSubmissions.id));
  if (status === "uploaded" || status === "blur") filters.push(eq(photoSubmissions.status, status));
  if (search) filters.push(or(like(students.name, `%${search}%`), like(students.studentId, `%${search}%`))!);
  return filters;
}

function freeFilters(status: DashboardStatus, search: string) {
  const filters = [eq(photoSubmissions.sourceMode, "free")];
  if (status === "pending") filters.push(isNull(photoSubmissions.id));
  if (status === "uploaded" || status === "blur") filters.push(eq(photoSubmissions.status, status));
  if (search) filters.push(like(photoSubmissions.name, `%${search}%`));
  return filters;
}

function filteredWhere(filters: Parameters<typeof and>[number][]) {
  return filters.length ? and(...filters) : undefined;
}

async function loadListSubmissions(status: DashboardStatus, classId: number, search: string) {
  const filters = listFilters(status, classId, search);
  const where = filteredWhere(filters);
  const rawRows = await db
    .select({
      submissionKey: photoSubmissions.submissionKey,
      studentId: students.studentId,
      nis: students.studentId,
      name: students.name,
      classId: students.classId,
      className: classes.name,
      attendanceNumber: students.attendanceNumber,
      status: photoSubmissions.status,
      uploadedAt: photoSubmissions.uploadedAt,
      photoId: photoSubmissions.id,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list")))
    .where(where)
    .orderBy(asc(students.classId), asc(students.attendanceNumber));
  const [overall] = await db
    .select({
      total: sql<number>`count(*)`,
      uploaded: sql<number>`sum(case when ${photoSubmissions.status} = 'uploaded' then 1 else 0 end)`,
      blur: sql<number>`sum(case when ${photoSubmissions.status} = 'blur' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${photoSubmissions.id} is null then 1 else 0 end)`,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list")))
    .where(where);
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
    .where(where)
    .groupBy(classes.id, classes.name)
    .orderBy(asc(classes.id));

  const rows: SubmissionRow[] = rawRows.map((row) => ({ ...row, sourceMode: "list", status: row.status ?? "pending" }));
  return {
    rows,
    total: Number(overall?.total ?? 0),
    uploaded: Number(overall?.uploaded ?? 0),
    blur: Number(overall?.blur ?? 0),
    pending: Number(overall?.pending ?? 0),
    byClass: byClass.map((row) => ({ className: row.className, total: Number(row.total), submitted: Number(row.submitted), pending: Number(row.pending) })),
  };
}

async function loadFreeSubmissions(status: DashboardStatus, search: string) {
  const filters = freeFilters(status, search);
  const where = filteredWhere(filters);
  const rawRows = await db
    .select({
      submissionKey: photoSubmissions.submissionKey,
      name: photoSubmissions.name,
      status: photoSubmissions.status,
      uploadedAt: photoSubmissions.uploadedAt,
      photoId: photoSubmissions.id,
    })
    .from(photoSubmissions)
    .where(where)
    .orderBy(asc(photoSubmissions.uploadedAt), asc(photoSubmissions.submissionKey));
  const [overall] = await db
    .select({
      total: sql<number>`count(*)`,
      uploaded: sql<number>`sum(case when ${photoSubmissions.status} = 'uploaded' then 1 else 0 end)`,
      blur: sql<number>`sum(case when ${photoSubmissions.status} = 'blur' then 1 else 0 end)`,
    })
    .from(photoSubmissions)
    .where(where);

  const rows: SubmissionRow[] = rawRows.map((row) => ({ ...row, sourceMode: "free" }));
  return {
    rows,
    total: Number(overall?.total ?? 0),
    uploaded: Number(overall?.uploaded ?? 0),
    blur: Number(overall?.blur ?? 0),
    pending: 0,
    byClass: [],
  };
}

function combineStats(sources: Awaited<ReturnType<typeof loadListSubmissions>>[], view: DashboardView) {
  const total = sources.reduce((sum, source) => sum + source.total, 0);
  const uploaded = sources.reduce((sum, source) => sum + source.uploaded, 0);
  const blur = sources.reduce((sum, source) => sum + source.blur, 0);
  const pending = sources.reduce((sum, source) => sum + source.pending, 0);
  const byClass = view === "free" ? [] : sources.flatMap((source) => source.byClass);
  return buildSubmissionStats({ total, uploaded, blur, pending, byClass });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getActiveSettings();
  const url = new URL(request.url);
  const view = normalizeDashboardView(url.searchParams.get("view"));
  const status = normalizeStatus(url.searchParams.get("status"));
  const classId = Number(url.searchParams.get("classId") ?? 0);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const sources = [];

  if (view === "all" || view === "list") sources.push(await loadListSubmissions(status, classId, search));
  if (view === "all" || view === "free") sources.push(await loadFreeSubmissions(status, search));

  const rows = sources.flatMap((source) => source.rows);
  return Response.json({
    activeMode: settings.mode,
    view,
    settings,
    stats: combineStats(sources, view),
    groups: groupSubmissionRows(rows, view),
    rows,
  });
}
