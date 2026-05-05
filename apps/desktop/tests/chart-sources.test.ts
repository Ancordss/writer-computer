import { describe, expect, test } from "vite-plus/test";
import { resolveChartSource } from "../src/components/editor-area/chart-sources";

describe("resolveChartSource", () => {
  test("resolves labeled table sources", () => {
    const note = [
      "<!-- chart-source: sales -->",
      "| month | revenue |",
      "|-------|---------|",
      "| Jan   | 12      |",
    ].join("\n");

    expect(resolveChartSource(note, { kind: "table", id: "sales" })).toEqual({
      kind: "table",
      headers: ["month", "revenue"],
      rows: [["Jan", "12"]],
    });
  });

  test("rejects duplicate table ids", () => {
    const note = [
      "<!-- chart-source: sales -->",
      "| month | revenue |",
      "|-------|---------|",
      "| Jan   | 12      |",
      "",
      "<!-- chart-source: sales -->",
      "| month | revenue |",
      "|-------|---------|",
      "| Feb   | 18      |",
    ].join("\n");

    expect(resolveChartSource(note, { kind: "table", id: "sales" })).toMatchObject({
      code: "duplicate-source",
    });
  });

  test("resolves labeled table with blank lines between comment and table", () => {
    const note = [
      "<!-- chart-source: sales -->",
      "",
      "| month | revenue |",
      "|-------|---------|",
      "| Jan   | 12      |",
    ].join("\n");

    expect(resolveChartSource(note, { kind: "table", id: "sales" })).toEqual({
      kind: "table",
      headers: ["month", "revenue"],
      rows: [["Jan", "12"]],
    });
  });

  test("does not match when non-table content sits between comment and table", () => {
    const note = [
      "<!-- chart-source: sales -->",
      "some paragraph",
      "| month | revenue |",
      "|-------|---------|",
      "| Jan   | 12      |",
    ].join("\n");

    expect(resolveChartSource(note, { kind: "table", id: "sales" })).toMatchObject({
      code: "missing-source",
    });
  });

  test("resolves frontmatter paths", () => {
    const note = [
      "---",
      "stats:",
      "  revenue:",
      "    jan: 12",
      "    feb: 18",
      "---",
      "",
      "# Note",
    ].join("\n");

    expect(resolveChartSource(note, { kind: "frontmatter", path: "stats.revenue" })).toEqual({
      kind: "frontmatter",
      value: { jan: 12, feb: 18 },
    });
  });
});
