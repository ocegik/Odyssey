import { describe, expect, it } from "vitest";
import {
  TOPIC_NODES,
  getTopicAncestors,
  getTopicChildren,
  getTopicNode,
  getTopicPickerOptions,
  isValidTagTopic,
} from "../topicRegistry";

describe("canonical topic registry", () => {
  it("contains unique stable IDs and valid parent links", () => {
    const ids = TOPIC_NODES.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    TOPIC_NODES.forEach((node) => {
      if (node.parentId) expect(getTopicNode(node.parentId)).not.toBeNull();
    });
  });

  it("derives analysis picker options from syllabus macro topics", () => {
    expect(getTopicPickerOptions("Quant").map((topic) => topic.id)).toEqual([
      "qa-arithmetic",
      "qa-algebra",
      "qa-geometry-mensuration",
      "qa-number-systems",
      "qa-modern-mathematics",
    ]);
    expect(getTopicPickerOptions("VARC").map((topic) => topic.label)).toEqual([
      "Reading Comprehension (RC)",
      "Verbal Ability (VA)",
    ]);
  });

  it("supports parent, child, and ancestor lookups", () => {
    expect(getTopicChildren("qa-arithmetic").map((topic) => topic.id)).toContain("qa-arithmetic-percentages");
    expect(getTopicAncestors("qa-arithmetic-percentages").map((topic) => topic.id)).toEqual([
      "qa-arithmetic",
      "qa",
    ]);
  });

  it("validates topic IDs against the analysis section", () => {
    expect(isValidTagTopic("qa-arithmetic", "Quant")).toBe(true);
    expect(isValidTagTopic("qa-arithmetic-percentages", "Quant")).toBe(true);
    expect(isValidTagTopic("qa-arithmetic", "VARC")).toBe(false);
    expect(isValidTagTopic("qa", "Quant")).toBe(false);
    expect(isValidTagTopic("does-not-exist", "Quant")).toBe(false);
  });
});
