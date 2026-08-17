import { describe, expect, it } from "vitest";
import { getLoginError, normalizeLoginUsername } from "./auth-form";

describe("admin login form", () => {
  it("trims the username before submitting", () => {
    expect(normalizeLoginUsername("  admin  ")).toBe("admin");
  });

  it("returns a useful message when the login request cannot be completed", () => {
    expect(getLoginError(null)).toBe("Login tidak dapat diproses. Periksa koneksi dan server.");
  });

  it("uses the API error when one is available", () => {
    expect(getLoginError({ error: "Username atau password salah." })).toBe("Username atau password salah.");
  });
});
