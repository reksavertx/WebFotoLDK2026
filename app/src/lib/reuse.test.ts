import { describe, expect, it } from "vitest";
import { isResetConfirmation, isRosterConfirmation } from "./reuse";

describe("reuse confirmations", () => {
  it("accepts only the exact reset confirmation", () => {
    expect(isResetConfirmation("HAPUS")).toBe(true);
    expect(isResetConfirmation("hapus")).toBe(false);
  });

  it("accepts only the exact roster confirmation", () => {
    expect(isRosterConfirmation("GANTI DATA")).toBe(true);
    expect(isRosterConfirmation("GANTI DATA ")).toBe(false);
  });
});
