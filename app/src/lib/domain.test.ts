import { describe, expect, it } from "vitest";
import { sanitizeFilename, transitionStatus } from "./domain";

describe("photo domain rules", () => {
  it("allows blur to become uploaded when an admin validates it", () => {
    expect(transitionStatus("blur", "valid")).toBe("uploaded");
  });

  it("sanitizes export filenames without changing the student identity", () => {
    expect(sanitizeFilename("X DKV 1 - 01 - A/B:C?.jpg")).toBe("X DKV 1 - 01 - A_B_C_.jpg");
  });
});
