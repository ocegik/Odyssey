import { describe, expect, it } from "vitest";
import { MOCK_IMPORT_HEADERS, parseMockSpreadsheetRows } from "../mockSpreadsheetImport";

const validRow = ["2026-08-15", "SIMCAT 6", 92.4, 38, 24, 20, 15, 26, 20, 16, 10, 34, 22, 18, 13];

describe("XLSX mock import", () => {
  it("maps a template row into the existing score-only import payload", () => {
    const [mock] = parseMockSpreadsheetRows([
      ["Odyssey mock-results import template"],
      ["Delete this example before importing."],
      [],
      MOCK_IMPORT_HEADERS,
      validRow,
    ]);

    expect(mock).toMatchObject({
      date: "2026-08-15",
      source: "SIMCAT 6",
      overallPercentile: 92.4,
      totalMarks: 98,
    });
    expect(mock.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: "VARC", manualTotalMarks: 38, totalQuestions: 24, attempted: 20, correct: 15 }),
      expect.objectContaining({ section: "Quant", manualTotalMarks: 34, totalQuestions: 22, attempted: 18, correct: 13 }),
    ]));
  });

  it("reports a missing required column before importing anything", () => {
    expect(() => parseMockSpreadsheetRows([["Date", "Mock name"], ["2026-08-15", "SIMCAT 6"]]))
      .toThrow("Missing required columns");
  });

  it("rejects invalid attempted/correct values through shared validation", () => {
    const invalid = [...validRow];
    invalid[6] = 21;
    expect(() => parseMockSpreadsheetRows([MOCK_IMPORT_HEADERS, invalid]))
      .toThrow(/correct.*whole number between 0 and attempted/);
  });
});
