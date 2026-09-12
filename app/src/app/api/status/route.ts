import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, photoSubmissions, students } from "@/db/schema";
import { buildPublicFreeStats, buildPublicListStats, publicStatusSettings, type PublicListRow } from "@/lib/public-status";
import { getActiveSettings } from "@/lib/settings";

async function loadListRows(): Promise<PublicListRow[]> {
  const rows = await db
    .select({
      name: students.name,
      className: classes.name,
      attendanceNumber: students.attendanceNumber,
      status: photoSubmissions.status,
      uploadedAt: photoSubmissions.uploadedAt,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .leftJoin(photoSubmissions, and(eq(photoSubmissions.studentId, students.id), eq(photoSubmissions.sourceMode, "list")))
    .orderBy(asc(classes.id), asc(students.attendanceNumber));

  return rows.map((row) => ({
    ...row,
    status: row.status === "uploaded" || row.status === "blur" ? row.status : "pending",
  }));
}

async function loadFreeRows() {
  return db
    .select({
      name: photoSubmissions.name,
      status: photoSubmissions.status,
      uploadedAt: photoSubmissions.uploadedAt,
    })
    .from(photoSubmissions)
    .where(eq(photoSubmissions.sourceMode, "free"))
    .orderBy(asc(photoSubmissions.uploadedAt), asc(photoSubmissions.name));
}

export async function GET(_request: Request) {
  try {
    const settings = await getActiveSettings();
    const responseSettings = publicStatusSettings(settings);

    if (settings.mode === "list") {
      const result = buildPublicListStats({ rows: await loadListRows() });
      const { classes: classGroups, ...stats } = result;
      return Response.json({ settings: responseSettings, mode: settings.mode, stats, classes: classGroups });
    }

    const result = buildPublicFreeStats({ rows: await loadFreeRows() });
    const { rows: submissions, ...stats } = result;
    return Response.json({ settings: responseSettings, mode: settings.mode, stats, submissions });
  } catch {
    return Response.json({ error: "Status tidak dapat dimuat." }, { status: 503 });
  }
}
