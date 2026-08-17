import { describe, expect, it } from "vitest";
import { shouldUseSecureCookie } from "./cookie";

describe("session cookie security", () => {
  it("does not mark local HTTP cookies as secure", () => {
    expect(shouldUseSecureCookie({ nodeEnv: "production", appUrl: "http://192.168.91.114:3000" })).toBe(false);
  });

  it("marks HTTPS production cookies as secure", () => {
    expect(shouldUseSecureCookie({ nodeEnv: "production", appUrl: "https://foto.example.com" })).toBe(true);
  });

  it("allows an explicit override", () => {
    expect(shouldUseSecureCookie({ nodeEnv: "production", appUrl: "http://localhost:3000", override: "true" })).toBe(true);
    expect(shouldUseSecureCookie({ nodeEnv: "production", appUrl: "https://foto.example.com", override: "false" })).toBe(false);
  });
});
