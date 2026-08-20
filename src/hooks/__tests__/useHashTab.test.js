import { describe, expect, it } from "vitest";
import { parseHashRoute } from "../useHashTab";

describe("mock route compatibility", () => {
  it("keeps the public homepage and login routes addressable", () => {
    expect(parseHashRoute("#/home", "home")).toEqual({
      tab: "home",
      mockId: null,
    });
    expect(parseHashRoute("#/login", "home")).toEqual({
      tab: "login",
      mockId: null,
    });
  });

  it("keeps ordinary tab routes free of a mock selection", () => {
    expect(parseHashRoute("#/overview", "overview")).toEqual({
      tab: "overview",
      mockId: null,
    });
  });

  it("redirects old Mock Log and Mock Analysis routes to Mocks", () => {
    expect(parseHashRoute("#/log", "overview")).toEqual({
      tab: "mocks",
      mockId: null,
    });
    expect(parseHashRoute("#/analysis", "overview")).toEqual({
      tab: "mocks",
      mockId: null,
    });
  });

  it("routes a mock analysis URL to its dedicated page", () => {
    expect(parseHashRoute("#/mocks/mock%2F42/analysis", "overview")).toEqual({
      tab: "mockAnalysis",
      mockId: "mock/42",
    });
  });

  it("keeps old mock analysis links working", () => {
    expect(parseHashRoute("#/analysis/mock%2F42", "overview")).toEqual({
      tab: "mockAnalysis",
      mockId: "mock/42",
    });
    expect(parseHashRoute("#/mocks/mock-42", "overview")).toEqual({
      tab: "mockAnalysis",
      mockId: "mock-42",
    });
    expect(parseHashRoute("#/analysis?mockId=mock-42", "overview")).toEqual({
      tab: "mockAnalysis",
      mockId: "mock-42",
    });
  });
});
