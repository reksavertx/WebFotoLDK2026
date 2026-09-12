import { describe, expect, it } from "vitest";
import {
  buildPublicFreeStats,
  buildPublicListStats,
  publicStatusSettings,
} from "./public-status";

describe("public status aggregation", () => {
  it("aggregates list rows including students without photos", () => {
    const result = buildPublicListStats({
      rows: [
        { name: "A", className: "X TJKT", attendanceNumber: 1, status: "uploaded", uploadedAt: "2026-09-01" },
        { name: "B", className: "X TJKT", attendanceNumber: 2, status: "pending", uploadedAt: null },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.uploaded).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.progress).toBe(50);
  });

  it("counts blur submissions and groups students deterministically", () => {
    const result = buildPublicListStats({
      rows: [
        { name: "B", className: "X TJKT", attendanceNumber: 2, status: "blur", uploadedAt: "2026-09-02" },
        { name: "C", className: "X DKV", attendanceNumber: 1, status: "uploaded", uploadedAt: "2026-09-03" },
        { name: "A", className: "X TJKT", attendanceNumber: 1, status: "pending", uploadedAt: null },
      ],
    });

    expect(result).toMatchObject({ total: 3, submitted: 2, uploaded: 1, blur: 1, pending: 1, progress: 66.7 });
    expect(result.classes.map((group) => group.className)).toEqual(["X TJKT", "X DKV"]);
    expect(result.classes[0].students.map((student) => student.name)).toEqual(["A", "B"]);
    expect(result.classes[0]).toMatchObject({ total: 2, uploaded: 0, blur: 1, pending: 1, progress: 50 });
  });

  it("counts free submissions and strips internal fields from rows", () => {
    const result = buildPublicFreeStats({
      rows: [
        {
          name: "Budi",
          status: "blur",
          uploadedAt: "2026-09-02",
          submissionKey: "secret-key",
          storagePath: "/private/photo.jpg",
        },
        {
          name: "Ani",
          status: "uploaded",
          uploadedAt: new Date("2026-09-03"),
          photoId: 12,
          nis: "secret-nis",
        },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.submitted).toBe(2);
    expect(result.blur).toBe(1);
    expect(result.progress).toBe(100);
    expect(result.rows).toEqual([
      { name: "Budi", status: "blur", uploadedAt: "2026-09-02" },
      { name: "Ani", status: "uploaded", uploadedAt: new Date("2026-09-03") },
    ]);
    expect(result.rows[0]).not.toHaveProperty("submissionKey");
    expect(result.rows[0]).not.toHaveProperty("storagePath");
    expect(result.rows[1]).not.toHaveProperty("photoId");
    expect(result.rows[1]).not.toHaveProperty("nis");
  });

  it("rounds progress to one decimal and handles empty input", () => {
    expect(buildPublicListStats({ rows: [] })).toMatchObject({
      total: 0,
      submitted: 0,
      uploaded: 0,
      blur: 0,
      pending: 0,
      progress: 0,
      classes: [],
    });
    expect(buildPublicFreeStats({
      rows: [
        { name: "A", status: "uploaded", uploadedAt: "2026-09-01" },
        { name: "B", status: "blur", uploadedAt: "2026-09-02" },
        { name: "C", status: "blur", uploadedAt: "2026-09-03" },
      ],
    }).progress).toBe(100);
  });

  it("does not expose internal identifiers in public settings", () => {
    expect(publicStatusSettings({
      id: 1,
      mode: "list",
      title: "Event",
      year: "2026",
      description: "",
      createdAt: new Date(),
      secret: "private",
    })).toEqual({ mode: "list", title: "Event", year: "2026", description: "" });
  });
});
