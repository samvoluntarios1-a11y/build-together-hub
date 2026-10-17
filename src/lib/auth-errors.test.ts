import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("auth error classification", () => {
  it("distinguishes invalid credentials from connection failures", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).not.toBe(authErrorMessage(new TypeError("Failed to fetch")));
  });
  it("distinguishes an unconfirmed account from invalid credentials", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).not.toBe(authErrorMessage({ code: "invalid_credentials" }));
  });
  it("does not expose arbitrary provider error details", () => {
    expect(authErrorMessage({ message: "private internal details" })).not.toContain("private internal details");
  });
});