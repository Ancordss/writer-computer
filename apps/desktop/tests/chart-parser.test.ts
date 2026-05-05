import { describe, expect, test } from "vite-plus/test";
import { chartError } from "../src/components/editor-area/chart-errors";
import { parseChartBlock } from "../src/components/editor-area/chart-parser";

describe("chartError", () => {
  test("creates stable machine-readable errors", () => {
    expect(chartError("missing-source", 'Chart source "sales" was not found')).toEqual({
      code: "missing-source",
      message: 'Chart source "sales" was not found',
      location: undefined,
    });
  });
});

describe("parseChartBlock", () => {
  test("parses valid table config", () => {
    expect(parseChartBlock("type: bar\nsource: table:sales\nx: month\ny: revenue")).toEqual({
      type: "bar",
      source: { kind: "table", id: "sales" },
      x: "month",
      y: "revenue",
      title: undefined,
    });
  });

  test("accepts selector-free frontmatter config", () => {
    expect(parseChartBlock("type: line\nsource: frontmatter:stats.revenue")).toEqual({
      type: "line",
      source: { kind: "frontmatter", path: "stats.revenue" },
      title: undefined,
    });
  });

  test("rejects malformed yaml", () => {
    expect(parseChartBlock("type: bar\nsource: [table:sales")).toMatchObject({
      code: "invalid-config",
    });
  });

  test("rejects unknown chart types", () => {
    expect(parseChartBlock("type: scatter\nsource: table:sales")).toMatchObject({
      code: "invalid-config",
    });
  });
});
