import { describe, expect, it } from "vitest";
import { canPreview, initialOpenGroups } from "./dashboard";

describe("dashboard UI helpers", () => {
  it("starts with every group closed", () => {
    expect(initialOpenGroups(["class:1", "class:2"])).toEqual([]);
  });

  it("allows preview only when a submission key exists", () => {
    expect(canPreview({ submissionKey: "abc", status: "uploaded" })).toBe(true);
    expect(canPreview({ submissionKey: null, status: "pending" })).toBe(false);
  });
});
