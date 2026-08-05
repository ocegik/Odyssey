import { describe, expect, it } from "vitest";
import { emptyMockForm, mockFormToPayload, validateMockForm } from "../mockFormModel";

describe("overall percentile form input", () => {
  it("requires a reported overall percentile", () => {
    const form = emptyMockForm();
    form.source = "SIMCAT 6";
    form.sections.forEach((section) => { section.score = "20"; });

    expect(validateMockForm(form)).toContain("Enter the overall percentile as a number between 0 and 100.");
  });

  it("persists the reported overall percentile at mock level", () => {
    const form = emptyMockForm();
    form.source = "SIMCAT 6";
    form.overallPercentile = "92.4";
    form.sections.forEach((section) => { section.score = "20"; });

    expect(validateMockForm(form)).toEqual([]);
    expect(mockFormToPayload(form)).toMatchObject({
      totalMarks: 60,
      overallPercentile: 92.4,
    });
  });
});
