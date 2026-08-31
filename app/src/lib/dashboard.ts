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

export function buildAdminExportUrl(classId: string, all = false) {
  return all || !classId ? "/api/admin/export/all" : `/api/admin/export/${classId}`;
}
