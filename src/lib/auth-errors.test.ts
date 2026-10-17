import { describe, expect, it } from "bun:test";
import { authErrorMessage } from "./auth-errors";

describe("auth failures", () => {
  it("distinguishes credentials from network failures", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).not.toBe(authErrorMessage(new TypeError("Failed to fetch")));
  });
  it("distinguishes unconfirmed accounts from invalid credentials", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).not.toBe(authErrorMessage({ code: "invalid_credentials" }));
  });
  it("never exposes arbitrary internal details", () => {
    expect(authErrorMessage({ message: "private internal details" })).not.toContain("private internal details");
  });
});