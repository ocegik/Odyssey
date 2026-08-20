import { describe, expect, it } from "vitest";
import { getOAuthCallbackUrl } from "../oauthRedirect";

describe("Google OAuth callback destination", () => {
  it("uses the bare app URL so Supabase owns the only URL fragment", () => {
    expect(getOAuthCallbackUrl("https://odysseyprep.vercel.app")).toBe(
      "https://odysseyprep.vercel.app/",
    );
  });

  it("does not put a hash-routed dashboard destination in redirectTo", () => {
    expect(getOAuthCallbackUrl("http://localhost:5173")).not.toContain("#");
  });
});
