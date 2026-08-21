import { describe, expect, it } from "vitest";
import { emptyMockForm, mockFormToPayload, validateMockForm } from "../mockFormModel";

describe("overall percentile form input", () => {
  it("allows a mock to be saved without an overall percentile", () => {
    const form = emptyMockForm();
    form.source = "SIMCAT 6";
    form.sections.forEach((section) => { section.score = "20"; });

    expect(validateMockForm(form)).toEqual([]);
    expect(mockFormToPayload(form).overallPercentile).toBeUndefined();
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
