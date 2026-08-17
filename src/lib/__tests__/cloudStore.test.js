import { describe, expect, it } from "vitest";
import {
  analysisRowToDetailedAnalysis,
  detailedAnalysisToRow,
  learningStateToSyllabusRows,
  mockRowsToDataset,
  syllabusRowsToLearningState,
} from "../cloudStore";

describe("syllabus cloud storage mapping", () => {
  it("maps the learning-state blob to one row per topic and back", () => {
    const state = {
      progress: {
        "qa-arithmetic-percentages": {
          completed: true,
          completedAt: "2026-08-17T10:00:00.000Z",
          notes: "Revisit compound percentages",
          resources: ["lesson-1"],
          legacyMetrics: { mockAccuracy: 0.42, attempts: 7 },
        },
      },
      revisionEvents: [{
        id: "r_1",
        topicId: "qa-arithmetic-percentages",
        sourceQuestionId: "mock-1:q-3",
        action: "queued",
        occurredAt: "2026-08-17T10:00:00.000Z",
      }],
    };

    const rows = learningStateToSyllabusRows(state, "user-123");
    expect(rows).toEqual([{
      user_id: "user-123",
      topic_id: "qa-arithmetic-percentages",
      completion_status: "completed",
      completed_at: "2026-08-17T10:00:00.000Z",
      notes: "Revisit compound percentages",
      resources: ["lesson-1"],
      revision_history: state.revisionEvents,
      metrics: { mockAccuracy: 0.42, attempts: 7 },
    }]);

    expect(syllabusRowsToLearningState(rows)).toEqual({
      progress: {
        "qa-arithmetic-percentages": {
          completed: true,
          completionStatus: "completed",
          completedAt: "2026-08-17T10:00:00.000Z",
          notes: "Revisit compound percentages",
          resources: ["lesson-1"],
          legacyMetrics: { mockAccuracy: 0.42, attempts: 7 },
        },
      },
      revisionEvents: state.revisionEvents,
    });
  });
});

describe("mock cloud storage mapping", () => {
  it("reassembles parent and section rows into the existing mock dataset blob", () => {
    const rows = [{
      id: "f9a81a14-d79f-448c-a23c-d088cf571cc0",
      legacy_mock_id: "m_legacy",
      mock_date: "2026-08-17",
      source: "SIMCAT 7",
      manual_total_marks: 92,
      overall_percentile: 97.25,
      created_at: "2026-08-17T10:00:00.000Z",
      sections: [{
        id: "68c6d6c4-3d14-4f0a-aad3-676fca231acf",
        section_name: "VARC",
        attempted: 20,
        correct: 15,
        total_questions: 24,
        percentile: 98.5,
        manual_total_marks: 42,
        question_set_count: 0,
        question_blocks: [{ id: "b1", type: "independent", name: "Questions", startQuestion: 1, endQuestion: 24 }],
        notes: "Read options carefully",
        created_at: "2026-08-17T10:01:00.000Z",
      }],
    }];

    expect(mockRowsToDataset(rows)).toEqual({
      version: 3,
      mocks: [{
        id: "m_legacy",
        createdAt: Date.parse("2026-08-17T10:00:00.000Z"),
        date: "2026-08-17",
        source: "SIMCAT 7",
        manualTotalMarks: 92,
        overallPercentile: 97.25,
        analysis: null,
        sections: {
          VARC: {
            id: "68c6d6c4-3d14-4f0a-aad3-676fca231acf",
            mockId: "m_legacy",
            createdAt: Date.parse("2026-08-17T10:01:00.000Z"),
            section: "VARC",
            attempted: 20,
            correct: 15,
            totalQuestions: 24,
            percentile: 98.5,
            manualTotalMarks: 42,
            questionSetCount: 0,
            questionBlocks: [{ id: "b1", type: "independent", name: "Questions", startQuestion: 1, endQuestion: 24 }],
            notes: "Read options carefully",
          },
        },
      }],
    });
  });

  it("maps the optional one-to-one analysis row to and from the app document", () => {
    const analysis = {
      id: "a_local",
      createdAt: Date.parse("2026-08-17T10:02:00.000Z"),
      schemaVersion: 3,
      sourceFormat: "in-app-structured-analysis",
      mockName: "SIMCAT 7",
      date: "2026-08-17",
      overallReflection: "Slow on the last RC.",
      structureText: "4 RCs and 8 VA questions",
      insightDimensions: ["timeManagement"],
      sections: { VARC: { section: "VARC", blocks: [] } },
      summary: { totalQuestions: 0, unreviewed: 0 },
    };

    expect(detailedAnalysisToRow(analysis, "db-mock", "user-123")).toEqual({
      user_id: "user-123",
      mock_id: "db-mock",
      schema_version: 3,
      source_format: "in-app-structured-analysis",
      overall_reflection: "Slow on the last RC.",
      structure_text: "4 RCs and 8 VA questions",
      document: {
        mockName: "SIMCAT 7",
        date: "2026-08-17",
        insightDimensions: ["timeManagement"],
        sections: { VARC: { section: "VARC", blocks: [] } },
      },
      summary: { totalQuestions: 0, unreviewed: 0 },
      created_at: "2026-08-17T10:02:00.000Z",
    });

    expect(analysisRowToDetailedAnalysis({
      id: "db-analysis",
      schema_version: 3,
      source_format: "in-app-structured-analysis",
      overall_reflection: "Slow on the last RC.",
      structure_text: "4 RCs and 8 VA questions",
      document: {
        mockName: "SIMCAT 7",
        date: "2026-08-17",
        insightDimensions: ["timeManagement"],
        sections: { VARC: { section: "VARC", blocks: [] } },
      },
      summary: { totalQuestions: 0, unreviewed: 0 },
      created_at: "2026-08-17T10:02:00.000Z",
      updated_at: "2026-08-17T10:03:00.000Z",
    })).toEqual({
      ...analysis,
      id: "db-analysis",
      updatedAt: Date.parse("2026-08-17T10:03:00.000Z"),
    });
  });
});
