export type PublicStatus = "uploaded" | "blur" | "pending";
export type PublicSubmittedStatus = Exclude<PublicStatus, "pending">;

export type PublicListRow = {
  name: string;
  className: string;
  attendanceNumber: number;
  status: PublicStatus;
  uploadedAt: Date | string | null;
};

export type PublicFreeRow = {
  name: string;
  status: PublicSubmittedStatus;
  uploadedAt: Date | string | null;
};

export type PublicClassSummary = {
  className: string;
  total: number;
  uploaded: number;
  blur: number;
  pending: number;
  progress: number;
  students: PublicListRow[];
};

export type PublicListStats = {
  total: number;
  uploaded: number;
  blur: number;
  pending: number;
  progress: number;
  classes: PublicClassSummary[];
};

export type PublicFreeStats = {
  total: number;
  submitted: number;
  blur: number;
  progress: number;
  rows: PublicFreeRow[];
};

export type PublicStatusSettings = {
  mode: "list" | "free";
  title: string;
  year: string;
  description: string;
};

function progressFor(submitted: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((submitted / total) * 1000) / 10;
}

function sanitizeListRow(row: PublicListRow): PublicListRow {
  return {
    name: row.name,
    className: row.className,
    attendanceNumber: row.attendanceNumber,
    status: row.status,
    uploadedAt: row.uploadedAt,
  };
}

function sanitizeFreeRow(row: PublicFreeRow): PublicFreeRow {
  return {
    name: row.name,
    status: row.status,
    uploadedAt: row.uploadedAt,
  };
}

function countStatuses(rows: readonly PublicListRow[]) {
  const counts = { uploaded: 0, blur: 0, pending: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function buildPublicListStats<T extends PublicListRow>(input: { rows: readonly T[] }): PublicListStats {
  const classes = new Map<string, PublicListRow[]>();

  for (const row of input.rows) {
    const students = classes.get(row.className);
    const sanitizedRow = sanitizeListRow(row);
    if (students) {
      students.push(sanitizedRow);
    } else {
      classes.set(row.className, [sanitizedRow]);
    }
  }

  const classSummaries = [...classes].map(([className, students]) => {
    students.sort((left, right) => left.attendanceNumber - right.attendanceNumber);
    const counts = countStatuses(students);
    return {
      className,
      total: students.length,
      ...counts,
      progress: progressFor(counts.uploaded + counts.blur, students.length),
      students,
    };
  });

  const counts = countStatuses(input.rows);
  return {
    total: input.rows.length,
    ...counts,
    progress: progressFor(counts.uploaded + counts.blur, input.rows.length),
    classes: classSummaries,
  };
}

export function buildPublicFreeStats<T extends PublicFreeRow>(input: { rows: readonly T[] }): PublicFreeStats {
  const rows = input.rows.map(sanitizeFreeRow);
  const blur = rows.filter((row) => row.status === "blur").length;

  return {
    total: rows.length,
    submitted: rows.length,
    blur,
    progress: progressFor(rows.length, rows.length),
    rows,
  };
}

export function publicStatusSettings<T extends PublicStatusSettings>(settings: T): PublicStatusSettings {
  return {
    mode: settings.mode,
    title: settings.title,
    year: settings.year,
    description: settings.description,
  };
}
