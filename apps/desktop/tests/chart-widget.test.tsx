import { describe, expect, test } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartErrorWidget, ChartWidget } from "../src/components/editor-area/chart-widget";

describe("ChartWidget", () => {
  test("renders a bar chart as svg", () => {
    const html = renderToStaticMarkup(
      <ChartWidget
        config={{ type: "bar", source: { kind: "table", id: "sales" }, title: "Revenue" }}
        data={{ kind: "xy", rows: [{ x: "Jan", y: 12 }] }}
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Revenue"');
  });

  test("renders a line chart as svg", () => {
    const html = renderToStaticMarkup(
      <ChartWidget
        config={{ type: "line", source: { kind: "table", id: "sales" }, title: "Trend" }}
        data={{
          kind: "xy",
          rows: [
            { x: "Jan", y: 12 },
            { x: "Feb", y: 18 },
          ],
        }}
      />,
    );

    expect(html).toContain("polyline");
    expect(html).toContain('aria-label="Trend"');
  });

  test("renders a pie chart as svg", () => {
    const html = renderToStaticMarkup(
      <ChartWidget
        config={{ type: "pie", source: { kind: "frontmatter", path: "stats" }, title: "Breakdown" }}
        data={{ kind: "slice", rows: [{ label: "Draft", value: 3 }] }}
      />,
    );

    expect(html).toContain("cm-chart-slice");
    expect(html).toContain('aria-label="Breakdown"');
  });

  test("renders an inline error panel", () => {
    const html = renderToStaticMarkup(
      <ChartErrorWidget
        error={{ code: "missing-source", message: 'Chart source "sales" was not found' }}
      />,
    );
    expect(html).toContain("Chart source &quot;sales&quot; was not found");
  });
});
