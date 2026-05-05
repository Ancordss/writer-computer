import { describe, expect, test } from "vite-plus/test";
import { normalizeChartData } from "../src/components/editor-area/chart-normalize";

describe("normalizeChartData", () => {
  test("normalizes table rows for bar charts", () => {
    expect(
      normalizeChartData(
        { type: "bar", source: { kind: "table", id: "sales" }, x: "month", y: "revenue" },
        {
          kind: "table",
          headers: ["month", "revenue"],
          rows: [
            ["Jan", "12"],
            ["Feb", "18"],
          ],
        },
      ),
    ).toEqual({
      kind: "xy",
      rows: [
        { x: "Jan", y: 12 },
        { x: "Feb", y: 18 },
      ],
    });
  });

  test("normalizes selector-free object maps", () => {
    expect(
      normalizeChartData(
        { type: "pie", source: { kind: "frontmatter", path: "stats.revenue" } },
        { kind: "frontmatter", value: { draft: 3, edit: 2 } },
      ),
    ).toEqual({
      kind: "slice",
      rows: [
        { label: "draft", value: 3 },
        { label: "edit", value: 2 },
      ],
    });
  });

  test("fails on invalid scalar frontmatter", () => {
    expect(
      normalizeChartData(
        { type: "line", source: { kind: "frontmatter", path: "stats.revenue" } },
        { kind: "frontmatter", value: 12 },
      ),
    ).toMatchObject({ code: "invalid-shape" });
  });
});
