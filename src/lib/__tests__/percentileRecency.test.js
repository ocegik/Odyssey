import { describe, expect, it } from "vitest";
import { latestKnownPercentile } from "../percentile";

describe("latestKnownPercentile", () => {
  const withPercentile = (label, value) => ({ label, overallPercentile: value });
  const withoutPercentile = (label) => ({ label });

  it("walks back to the most recent mock that actually has a percentile", () => {
    const result = latestKnownPercentile([
      withPercentile("old", 70),
      withPercentile("mid", 85),
      withoutPercentile("newest"),
    ]);

    expect(result.value).toBe(85);
    expect(result.mocksAgo).toBe(1);
    expect(result.mock.label).toBe("mid");
  });

  it("reports mocksAgo 0 when the newest mock has one", () => {
    expect(latestKnownPercentile([withPercentile("a", 60), withPercentile("b", 91)])).toMatchObject({
      value: 91,
      mocksAgo: 0,
    });
  });

  it("returns null when no mock has ever recorded a percentile", () => {
    expect(latestKnownPercentile([withoutPercentile("a"), withoutPercentile("b")])).toBeNull();
    expect(latestKnownPercentile([])).toBeNull();
  });
});
