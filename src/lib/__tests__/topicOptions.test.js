import { describe, expect, it } from "vitest";
import { TOPIC_OPTIONS } from "../analysisModel";

describe("legacy topic option compatibility", () => {
  it("is generated from migration mappings", () => {
    expect(TOPIC_OPTIONS.Quant).toEqual([
      "Arithmetic",
      "Algebra",
      "Geometry & Mensuration",
      "Number System",
      "Modern Math",
    ]);
    expect(TOPIC_OPTIONS.DILR).toContain("Sets & Venn Diagrams");
    expect(TOPIC_OPTIONS.VARC).toEqual(["Reading Comprehension", "Verbal Ability"]);
  });
});
