import { describe, expect, it } from "vitest";
import {
  getEffectiveTopicId,
  normalizeDetailedAnalysis,
} from "../analysisModel";
import { collectUnresolvedLegacyTopics } from "../topicMigrations";
import { flattenAnalysisQuestions } from "../detailedAnalysisInsights";
import { buildTopicRecords } from "../advancedInsights";

function analysisWithTopic(section, topic) {
  return normalizeDetailedAnalysis({
    sections: {
      [section]: {
        blocks: [{
          type: "independent",
          questions: [{ questionNumber: 1, topic, result: "Correct" }],
        }],
      },
    },
  });
}

describe("analysis topic compatibility migration", () => {
  it("adds a canonical reference while preserving the legacy display label", () => {
    const analysis = analysisWithTopic("Quant", "Arithmetic");
    const question = analysis.sections.Quant.blocks[0].questions[0];
    expect(question.topic).toBe("Arithmetic");
    expect(question.topicRef).toMatchObject({ topicId: "qa-arithmetic", source: "migration" });
    expect(analysis.schemaVersion).toBe(3);
  });

  it("maps detailed legacy labels to the appropriate canonical node", () => {
    const analysis = analysisWithTopic("DILR", "Data Sufficiency");
    const question = analysis.sections.DILR.blocks[0].questions[0];
    expect(question.topicRef.topicId).toBe("dilr-di-data-sufficiency");
  });

  it("does not guess an ambiguous historical label", () => {
    const analysis = analysisWithTopic("DILR", "Sets & Venn Diagrams");
    const question = analysis.sections.DILR.blocks[0].questions[0];
    expect(question.topic).toBe("Sets & Venn Diagrams");
    expect(question.topicRef).toBeNull();
  });

  it("preserves set inheritance for canonical references", () => {
    const analysis = normalizeDetailedAnalysis({
      sections: {
        Quant: {
          blocks: [{
            type: "set",
            topicRef: { topicId: "qa-arithmetic", source: "user", taxonomyVersion: 1 },
            questions: [{ questionNumber: 1, result: "Wrong" }],
          }],
        },
      },
    });
    const block = analysis.sections.Quant.blocks[0];
    const question = block.questions[0];
    expect(getEffectiveTopicId(block, question)).toBe("qa-arithmetic");
  });

  it("aggregates legacy and canonical representations into one topic record", () => {
    const first = analysisWithTopic("Quant", "Arithmetic");
    const second = normalizeDetailedAnalysis({
      sections: {
        Quant: {
          blocks: [{
            type: "independent",
            questions: [{
              questionNumber: 1,
              result: "Wrong",
              topicRef: { topicId: "qa-arithmetic", source: "user", taxonomyVersion: 1 },
            }],
          }],
        },
      },
    });
    const questions = flattenAnalysisQuestions([
      { id: "m1", date: "2026-01-01", source: "A", analysis: first },
      { id: "m2", date: "2026-01-02", source: "B", analysis: second },
    ]);
    const records = buildTopicRecords(questions);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ topicId: "qa-arithmetic", total: 2, attempted: 2, correct: 1 });
  });

  it("reports unresolved legacy labels without modifying their source records", () => {
    const analysis = analysisWithTopic("DILR", "Sets & Venn Diagrams");
    const mocks = [{ id: "m1", analysis }];
    expect(collectUnresolvedLegacyTopics(mocks)).toMatchObject([
      { section: "DILR", label: "Sets & Venn Diagrams", count: 1 },
    ]);
    expect(analysis.sections.DILR.blocks[0].questions[0].topic).toBe("Sets & Venn Diagrams");
  });
});
