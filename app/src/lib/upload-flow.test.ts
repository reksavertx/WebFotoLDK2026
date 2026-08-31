import { beforeEach, describe, expect, it, vi } from "vitest";
import { replacedStoragePathToDelete, validateUploadInput } from "./submissions";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn() },
  getActiveSettings: vi.fn(),
  processUpload: vi.fn(),
  removeStoredFile: vi.fn(),
  requireAdmin: vi.fn(),
  readFile: vi.fn(),
  storagePath: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/settings", () => ({ getActiveSettings: mocks.getActiveSettings }));
vi.mock("@/lib/storage", () => ({ processUpload: mocks.processUpload, removeStoredFile: mocks.removeStoredFile, storagePath: mocks.storagePath }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("node:fs/promises", () => ({ default: { readFile: mocks.readFile }, readFile: mocks.readFile }));

import { POST } from "@/app/api/photos/upload/route";
import { GET as getClassStudents } from "@/app/api/classes/[id]/students/route";
import { GET as getSubmissionPreview } from "@/app/api/photos/submission/[submissionKey]/route";

function queryBuilder<T>(rows: T[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
  };
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockResolvedValue(rows);
  builder.orderBy.mockResolvedValue(rows);
  return builder;
}

function insertBuilder() {
  const builder = { values: vi.fn(), onDuplicateKeyUpdate: vi.fn() };
  builder.values.mockReturnValue(builder);
  builder.onDuplicateKeyUpdate.mockResolvedValue(undefined);
  return builder;
}

function uploadRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.set("file", new File(["photo"], "photo.png", { type: "image/png" }));
  return new Request("http://localhost/api/photos/upload", { method: "POST", body: form });
}

describe("upload flow validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.insert.mockImplementation(() => insertBuilder());
    mocks.processUpload.mockImplementation(async (_file, submissionKey) => ({ storagePath: `${submissionKey}.jpg`, fileSize: 12, mimeType: "image/jpeg" }));
    mocks.removeStoredFile.mockResolvedValue(undefined);
  });

  it("requires only a name in free mode", () => {
    expect(validateUploadInput({ mode: "free", name: " Budi " })).toEqual({ name: "Budi" });
    expect(() => validateUploadInput({ mode: "free", name: "ab" })).toThrow();
  });

  it("requires class and student in list mode", () => {
    expect(() => validateUploadInput({ mode: "list", name: "Budi" })).toThrow();
  });

  it("accepts free uploads without trusting client class or student fields", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "free" });
    const response = await POST(uploadRequest({ mode: "free", name: " Budi ", classId: "99", studentId: "99" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Terimakasih Telah Mensubmit. Foto berhasil diunggah." });
    const values = mocks.db.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(values).toMatchObject({ sourceMode: "free", name: "Budi", className: null, attendanceNumber: null, nis: null, studentId: null });
    expect(values.submissionKey).toMatch(/^[a-f0-9]{32}$/);
    expect(values.storagePath).toBe(`${values.submissionKey}.jpg`);
    expect(mocks.processUpload).toHaveBeenCalledWith(expect.any(File), values.submissionKey);
  });

  it("creates separate rows for free uploads with duplicate names", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "free" });

    await POST(uploadRequest({ name: "Budi" }));
    await POST(uploadRequest({ name: "Budi" }));

    const insertCalls = mocks.db.insert.mock.results.map((result) => result.value.values.mock.calls[0][0]);
    expect(insertCalls[0].submissionKey).not.toBe(insertCalls[1].submissionKey);
    expect(insertCalls[0].studentId).toBeNull();
    expect(insertCalls[1].studentId).toBeNull();
  });

  it("rejects a free-shaped upload when list mode is active", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "list" });

    const response = await POST(uploadRequest({ mode: "free", name: "Budi" }));

    expect(response.status).toBe(400);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("rejects a list-shaped upload when free mode is active", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "free" });

    const response = await POST(uploadRequest({ mode: "list", classId: "1", studentId: "1" }));

    expect(response.status).toBe(400);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("snapshots the selected student and class for list uploads", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "list" });
    mocks.db.select.mockReturnValue(queryBuilder([{ id: 7, studentId: "NIS-7", name: "Budi", attendanceNumber: 3, nisn: "NISN-7", className: "X TKJ", previousStoragePath: null }]));

    const response = await POST(uploadRequest({ classId: "2", studentId: "7" }));

    expect(response.status).toBe(200);
    const values = mocks.db.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(values).toMatchObject({ sourceMode: "list", studentId: 7, name: "Budi", className: "X TKJ", attendanceNumber: 3, nis: "NIS-7" });
    expect(values.submissionKey).toMatch(/^[a-f0-9]{32}$/);
    expect(values.storagePath).toBe(`${values.submissionKey}.jpg`);
    expect(mocks.processUpload).toHaveBeenCalledWith(expect.any(File), values.submissionKey);
  });

  it("deletes only an unshared prior path after a successful replacement", () => {
    expect(replacedStoragePathToDelete("old.jpg", "new.jpg", false)).toBe("old.jpg");
    expect(replacedStoragePathToDelete("old.jpg", "old.jpg", false)).toBeNull();
    expect(replacedStoragePathToDelete("old.jpg", "new.jpg", true)).toBeNull();
    expect(replacedStoragePathToDelete(null, "new.jpg", false)).toBeNull();
  });

  it("keeps a newly written list file when the database write outcome is ambiguous", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "list" });
    mocks.db.select.mockReturnValue(queryBuilder([{ id: 7, studentId: "NIS-7", name: "Budi", attendanceNumber: 3, className: "X TKJ", previousStoragePath: "old.jpg" }]));
    const failingInsert = insertBuilder();
    failingInsert.onDuplicateKeyUpdate.mockRejectedValue(new Error("DB failed"));
    mocks.db.insert.mockReturnValue(failingInsert);

    const response = await POST(uploadRequest({ mode: "list", classId: "2", studentId: "7" }));

    expect(response.status).toBe(400);
    expect(mocks.removeStoredFile).not.toHaveBeenCalled();
  });

  it("keeps a prior path when another submission still uses it", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "list" });
    const selectResults = [
      [{ id: 7, studentId: "NIS-7", name: "Budi", attendanceNumber: 3, className: "X TKJ", previousStoragePath: "shared.jpg" }],
      [{ id: 99 }],
    ];
    mocks.db.select.mockImplementation(() => queryBuilder(selectResults.shift() ?? []));

    const response = await POST(uploadRequest({ mode: "list", classId: "2", studentId: "7" }));

    expect(response.status).toBe(200);
    expect(mocks.removeStoredFile).not.toHaveBeenCalledWith("shared.jpg");
  });

  it("derives pending status for students without a submission", async () => {
    mocks.db.select.mockReturnValue(queryBuilder([
      { id: 7, studentId: "NIS-7", name: "Budi", attendanceNumber: 3, status: null, submissionKey: null },
      { id: 8, studentId: "NIS-8", name: "Siti", attendanceNumber: 4, status: "blur", submissionKey: "blur-key" },
    ]));

    const response = await getClassStudents(new Request("http://localhost/api/classes/2/students"), { params: Promise.resolve({ id: "2" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 7, studentId: "NIS-7", name: "Budi", attendanceNumber: 3, status: "pending", submissionKey: null },
      { id: 8, studentId: "NIS-8", name: "Siti", attendanceNumber: 4, status: "blur", submissionKey: "blur-key" },
    ]);
  });

  it("requires admin access for submission previews", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const response = await getSubmissionPreview(new Request("http://localhost/api/photos/submission/key"), { params: Promise.resolve({ submissionKey: "key" }) });

    expect(response.status).toBe(401);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("serves a submission preview using its stored mime type", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ username: "admin" });
    mocks.db.select.mockReturnValue(queryBuilder([{ path: "key.jpg", mimeType: "image/jpeg" }]));
    mocks.storagePath.mockReturnValue("/safe/key.jpg");
    mocks.readFile.mockResolvedValueOnce(Buffer.from("jpeg"));

    const response = await getSubmissionPreview(new Request("http://localhost/api/photos/submission/key"), { params: Promise.resolve({ submissionKey: "key" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(await response.text()).toBe("jpeg");
    expect(mocks.storagePath).toHaveBeenCalledWith("key.jpg");
  });
});
