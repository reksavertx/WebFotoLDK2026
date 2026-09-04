import { describe, expect, it } from "vitest";
import { groupSubmissionRows } from "./dashboard";

describe("dashboard submission groups", () => {
  it("groups list rows by class in CSV order", () => {
    const groups = groupSubmissionRows([
      { sourceMode: "list", className: "X DKV 1", name: "B", status: "uploaded", submissionKey: "b" },
      { sourceMode: "list", className: "X TJKT", name: "A", status: "pending", submissionKey: null },
    ], "list");

    expect(groups.map((group) => group.title)).toEqual(["X DKV 1", "X TJKT"]);
  });

  it("puts free rows in one virtual group", () => {
    const groups = groupSubmissionRows([
      { sourceMode: "free", className: null, name: "Budi", status: "uploaded", submissionKey: "1" },
      { sourceMode: "free", className: null, name: "Ani", status: "blur", submissionKey: "2" },
    ], "free");

    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("Nama Bebas");
  });

  it("filters by view and counts submitted and pending rows", () => {
    const groups = groupSubmissionRows([
      { sourceMode: "list", className: "X TJKT", name: "A", status: "uploaded", submissionKey: "1" },
      { sourceMode: "list", className: "X TJKT", name: "B", status: "blur", submissionKey: "2" },
      { sourceMode: "list", className: "X TJKT", name: "C", status: "pending", submissionKey: null },
      { sourceMode: "free", className: null, name: "D", status: "uploaded", submissionKey: "3" },
    ], "list");

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "class:X TJKT", total: 3, submitted: 2, pending: 1 });
    expect(groups[0].rows.map((row) => row.name)).toEqual(["A", "B", "C"]);
  });

  it("includes both sources in the all view", () => {
    const groups = groupSubmissionRows([
      { sourceMode: "free", className: null, name: "Budi", status: "uploaded", submissionKey: "1" },
      { sourceMode: "list", className: "X TJKT", name: "Ani", status: "pending", submissionKey: null },
    ], "all");

    expect(groups.map((group) => group.title)).toEqual(["Nama Bebas", "X TJKT"]);
  });

  it("keeps free and null-class keys separate from real class keys", () => {
    const groups = groupSubmissionRows([
      { sourceMode: "list", className: "free", name: "Class free", status: "uploaded", submissionKey: "1" },
      { sourceMode: "free", className: null, name: "Free name", status: "uploaded", submissionKey: "2" },
      { sourceMode: "list", className: null, name: "No class", status: "pending", submissionKey: null },
    ], "all");

    expect(groups.map((group) => group.key)).toEqual(["class:free", "free", "class-missing"]);
    expect(groups.map((group) => group.rows.map((row) => row.name))).toEqual([
      ["Class free"],
      ["Free name"],
      ["No class"],
    ]);
  });
});
