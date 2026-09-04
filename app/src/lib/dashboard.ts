import type { PhotoStatus } from "./domain";

export type DashboardView = "all" | "list" | "free";

export type SubmissionRow = {
  submissionKey: string | null;
  studentId?: string | null;
  nis?: string | null;
  name: string;
  className?: string | null;
  attendanceNumber?: number | null;
  sourceMode: Exclude<DashboardView, "all">;
  status: PhotoStatus;
  uploadedAt?: Date | string | null;
  photoId?: number | null;
};

export type SubmissionGroup = {
  type: "class" | "free";
  key: string;
  title: string;
  total: number;
  submitted: number;
  pending: number;
  rows: SubmissionRow[];
};

export type DashboardInput = {
  total: number;
  uploaded: number;
  blur: number;
  pendingByClass: { className: string; total: number; pending: number }[];
};

export function buildDashboardStats(input: DashboardInput) {
  const submitted = input.uploaded + input.blur;
  const pending = Math.max(0, input.total - submitted);
  const submittedPercentage = input.total ? Math.round((submitted / input.total) * 1000) / 10 : 0;
  const pendingPercentage = input.total ? Math.round((pending / input.total) * 1000) / 10 : 0;
  return {
    submitted,
    pending,
    submittedPercentage,
    pendingPercentage,
    pendingByClass: sortClassesByPending(input.pendingByClass),
  };
}

export function sortClassesByPending(rows: { className: string; total: number; pending: number }[]) {
  return [...rows].sort((a, b) => b.pending - a.pending);
}

export type SubmissionStatsInput = {
  total: number;
  uploaded: number;
  blur: number;
  pending: number;
  byClass?: { className: string; total: number; submitted: number; pending: number }[];
};

export function buildSubmissionStats(input: SubmissionStatsInput) {
  const submitted = input.uploaded + input.blur;
  const submittedPercentage = input.total ? Math.round((submitted / input.total) * 1000) / 10 : 0;
  const pendingPercentage = input.total ? Math.round((input.pending / input.total) * 1000) / 10 : 0;
  return {
    total: input.total,
    uploaded: input.uploaded,
    blur: input.blur,
    submitted,
    pending: input.pending,
    submittedPercentage,
    pendingPercentage,
    byClass: input.byClass ?? [],
  };
}

export function groupSubmissionRows(rows: SubmissionRow[], view: DashboardView): SubmissionGroup[] {
  const groups = new Map<string, SubmissionGroup>();

  for (const row of rows) {
    if (view !== "all" && row.sourceMode !== view) continue;

    const isFree = row.sourceMode === "free";
    const key = isFree ? "free" : row.className === null || row.className === undefined ? "class-missing" : `class:${row.className}`;
    const existing = groups.get(key);
    const group = existing ?? {
      type: isFree ? "free" : "class",
      key,
      title: isFree ? "Nama Bebas" : row.className ?? "Tanpa Kelas",
      total: 0,
      submitted: 0,
      pending: 0,
      rows: [],
    };

    group.total += 1;
    if (row.status === "pending") group.pending += 1;
    else group.submitted += 1;
    group.rows.push(row);
    groups.set(key, group);
  }

  return [...groups.values()];
}

export function buildAdminExportUrl(classId: string, all = false) {
  return all || !classId ? "/api/admin/export/all" : `/api/admin/export/${classId}`;
}
