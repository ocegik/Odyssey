import { describe, expect, it } from "vitest";
import { accountStorageKey } from "../useCloudSyncedState";

describe("account-scoped browser storage", () => {
  it("uses a separate cache key for every signed-in account", () => {
    expect(accountStorageKey("cat-mock-tracker:entries", "user-one"))
      .toBe("cat-mock-tracker:entries:account:user-one");
    expect(accountStorageKey("cat-mock-tracker:entries", "user-two"))
      .toBe("cat-mock-tracker:entries:account:user-two");
  });

  it("does not use the old shared key without an authenticated account", () => {
    expect(accountStorageKey("cat-mock-tracker:entries", null)).toBeNull();
  });
});
