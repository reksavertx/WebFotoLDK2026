import { describe, expect, it } from "vitest";
import { buildSubmissionStats } from "./dashboard";

describe("submission dashboard statistics", () => {
  it("counts uploaded and blur as submitted in list mode", () => {
    expect(buildSubmissionStats({ total: 10, uploaded: 6, blur: 2, pending: 2 }).submitted).toBe(8);
  });

  it("calculates pending totals and percentages", () => {
    expect(buildSubmissionStats({ total: 10, uploaded: 6, blur: 2, pending: 2 })).toMatchObject({
      pending: 2,
      submittedPercentage: 80,
      pendingPercentage: 20,
    });
  });

  it("includes submitted and pending counts for each class", () => {
    expect(buildSubmissionStats({
      total: 10,
      uploaded: 6,
      blur: 2,
      pending: 2,
      byClass: [
        { className: "X TJKT", total: 5, submitted: 4, pending: 1 },
        { className: "X DKV", total: 5, submitted: 4, pending: 1 },
      ],
    }).byClass).toEqual([
      { className: "X TJKT", total: 5, submitted: 4, pending: 1 },
      { className: "X DKV", total: 5, submitted: 4, pending: 1 },
    ]);
  });

  it("does not create class chart rows for free submissions", () => {
    expect(buildSubmissionStats({ total: 3, uploaded: 3, blur: 0, pending: 0 }).byClass).toEqual([]);
  });
});
