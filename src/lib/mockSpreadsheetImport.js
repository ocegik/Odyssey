import * as XLSX from "xlsx";
import { parseScoreOnlyMockImport } from "./mockModel";

export const MOCK_IMPORT_HEADERS = [
  "Date*",
  "Mock / exam name*",
  "Overall percentile",
  "VARC score*",
  "VARC questions*",
  "VARC attempted",
  "VARC correct",
  "DILR score*",
  "DILR questions*",
  "DILR attempted",
  "DILR correct",
  "Quant score*",
  "Quant questions*",
  "Quant attempted",
  "Quant correct",
];

const headerAliases = {
  date: ["date", "mock date", "test date"],
  source: ["mock exam name", "mock name", "exam name", "source", "mock exam"],
  overallPercentile: ["overall percentile", "percentile"],
  "VARC.score": ["varc score", "varc marks"],
  "VARC.totalQuestions": ["varc questions", "varc total questions", "varc total qs"],
  "VARC.attempted": ["varc attempted", "varc attempts"],
  "VARC.correct": ["varc correct", "varc correct answers"],
  "DILR.score": ["dilr score", "dilr marks"],
  "DILR.totalQuestions": ["dilr questions", "dilr total questions", "dilr total qs"],
  "DILR.attempted": ["dilr attempted", "dilr attempts"],
  "DILR.correct": ["dilr correct", "dilr correct answers"],
  "Quant.score": ["quant score", "qa score", "quant marks", "qa marks"],
  "Quant.totalQuestions": ["quant questions", "qa questions", "quant total questions", "qa total questions", "quant total qs"],
  "Quant.attempted": ["quant attempted", "qa attempted", "quant attempts", "qa attempts"],
  "Quant.correct": ["quant correct", "qa correct", "quant correct answers", "qa correct answers"],
};

const REQUIRED_FIELDS = [
  "date",
  "source",
  "VARC.score",
  "VARC.totalQuestions",
  "DILR.score",
  "DILR.totalQuestions",
  "Quant.score",
  "Quant.totalQuestions",
];

function normalizedHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\*/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  if (!text) return text;
  const iso = text.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? text : parsed.toISOString().slice(0, 10);
}

function columnMap(headers) {
  const normalized = headers.map(normalizedHeader);
  return Object.fromEntries(Object.entries(headerAliases).map(([field, aliases]) => [
    field,
    normalized.findIndex((header) => aliases.includes(header)),
  ]));
}

function cellValue(row, index) {
  return index >= 0 ? row[index] : undefined;
}

function rowHasData(row) {
  return row.some(isFilled);
}

export function parseMockSpreadsheetRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("The workbook needs a header row and at least one mock result row.");
  }

  const headerRowIndex = rows.findIndex((row) => {
    const columns = columnMap(row);
    return columns.date >= 0 && columns.source >= 0;
  });
  if (headerRowIndex < 0) {
    throw new Error("Could not find the Date and Mock / exam name header row. Download the template to use the supported structure.");
  }

  const headers = rows[headerRowIndex];
  const dataRows = rows.slice(headerRowIndex + 1);
  const columns = columnMap(headers);
  const missingColumns = REQUIRED_FIELDS.filter((field) => columns[field] < 0);
  if (missingColumns.length > 0) {
    throw new Error(`Missing required column${missingColumns.length === 1 ? "" : "s"}: ${missingColumns.join(", ")}. Download the template to use the supported structure.`);
  }

  const rowsWithData = dataRows
    .map((row, index) => ({ row, rowNumber: headerRowIndex + index + 2 }))
    .filter(({ row }) => rowHasData(row));
  if (rowsWithData.length === 0) throw new Error("The workbook contains no mock result rows.");

  const importRows = rowsWithData.map(({ row, rowNumber }) => {
    const missingValues = REQUIRED_FIELDS.filter((field) => !isFilled(cellValue(row, columns[field])));
    if (missingValues.length > 0) {
      throw new Error(`Row ${rowNumber}: missing ${missingValues.join(", ")}.`);
    }

    const section = (name) => ({
      section: name,
      score: cellValue(row, columns[`${name}.score`]),
      totalQuestions: cellValue(row, columns[`${name}.totalQuestions`]),
      attempted: cellValue(row, columns[`${name}.attempted`]),
      correct: cellValue(row, columns[`${name}.correct`]),
    });

    return {
      date: normalizeDate(cellValue(row, columns.date)),
      source: cellValue(row, columns.source),
      overallPercentile: cellValue(row, columns.overallPercentile),
      sections: [section("VARC"), section("DILR"), section("Quant")],
    };
  });

  try {
    return parseScoreOnlyMockImport(importRows);
  } catch (error) {
    throw new Error(`Check the values in your workbook. ${error.message}`);
  }
}

export async function parseMockSpreadsheetFile(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("The workbook does not contain a worksheet.");
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: "",
    raw: false,
    dateNF: "yyyy-mm-dd",
  });
  return parseMockSpreadsheetRows(rows);
}

export function downloadMockSpreadsheetTemplate() {
  const exampleRow = ["2026-08-15", "SIMCAT 6", 92.4, 38, 24, 20, 15, 26, 20, 16, 10, 34, 22, 18, 13];
  const guide = [
    ["How to prepare your import"],
    [],
    ["Rule", "What to do"],
    ["One mock per row", "Use the Mock results sheet. Keep the header row unchanged."],
    ["Required fields", "Date, mock / exam name, score, and total question count for VARC, DILR, and Quant."],
    ["Optional fields", "Overall percentile, attempted, and correct. Correct requires attempted, and cannot exceed it."],
    ["Date format", "Use yyyy-mm-dd (for example, 2026-08-15)."],
    ["Import behavior", "Uploaded mocks are added to the existing log. They do not replace anything."],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Odyssey mock-results import template"],
    ["One row = one mock. Fill every required column; optional columns can be left blank. Delete the example before importing."],
    [],
    MOCK_IMPORT_HEADERS,
    exampleRow,
  ]);
  sheet["!merges"] = [XLSX.utils.decode_range("A1:O1"), XLSX.utils.decode_range("A2:O2")];
  sheet["!cols"] = [
    { wch: 14 }, { wch: 24 }, { wch: 18 }, ...Array.from({ length: 12 }, () => ({ wch: 16 })),
  ];
  sheet["!freeze"] = { xSplit: 0, ySplit: 4 };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Mock results");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(guide), "How to use");
  XLSX.writeFile(workbook, "odyssey-mock-import-template.xlsx", { compression: true });
}
