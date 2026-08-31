import { describe, expect, it } from "vitest";
import { freeSubmissionFilename, validateFreeName } from "./submissions";

describe("reusable photo submission domain", () => {
  it("validates and trims a free-form name", () => {
    expect(validateFreeName("  Budi Santoso  ")).toBe("Budi Santoso");
    expect(() => validateFreeName("ab")).toThrow();
  });

  it("creates a collision-safe free submission filename", () => {
    expect(freeSubmissionFilename("01HABC", "Budi/A", "jpg")).toBe("01HABC - Budi_A.jpg");
  });
});
