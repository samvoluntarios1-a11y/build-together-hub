import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "./auth-errors";

describe("auth failures", () => {
  it("distinguishes credentials from network failures", () => {
    assert.notEqual(authErrorMessage({ code: "invalid_credentials" }), authErrorMessage(new TypeError("Failed to fetch")));
  });
  it("distinguishes unconfirmed accounts from invalid credentials", () => {
    assert.notEqual(authErrorMessage({ code: "email_not_confirmed" }), authErrorMessage({ code: "invalid_credentials" }));
  });
  it("never exposes arbitrary internal details", () => {
    assert.equal(authErrorMessage({ message: "private internal details" }).includes("private internal details"), false);
  });
});