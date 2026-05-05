// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vite-plus/test";
import {
  createTestEditor,
  markdownWithChartFence,
  markdownWithDuplicateIds,
  markdownWithFrontmatterBackedChart,
  markdownWithNonNumericChartTable,
  moveSelectionInsideChartFence,
  updateFrontmatterValue,
  updateTableValue,
} from "./helpers/chart-editor";

const views: Array<{ destroy(): void; dom: HTMLElement }> = [];

afterEach(() => {
  while (views.length > 0) {
    const view = views.pop();
    view?.destroy();
    view?.dom.parentElement?.remove();
  }
});

describe("chartDecorations", () => {
  test("replaces a valid chart fence when selection is outside the block", () => {
    const view = createTestEditor(markdownWithChartFence);
    views.push(view);
    expect(view.dom.querySelector(".cm-chart-widget")).not.toBeNull();
    expect(view.dom.textContent).not.toContain("```chart");
  });

  test("shows an error widget for duplicate table ids", () => {
    const view = createTestEditor(markdownWithDuplicateIds);
    views.push(view);
    expect(view.dom.textContent).toContain("defined more than once");
  });

  test("shows an error widget for invalid chart config", () => {
    const view = createTestEditor(
      "\n```chart\ntype: pie\nsource: table:sales\nx: month\ny: revenue\n```\n",
    );
    views.push(view);
    expect(view.dom.textContent).toContain("Pie charts require label and value fields");
  });

  test("shows an error widget for normalization failures", () => {
    const view = createTestEditor(markdownWithNonNumericChartTable);
    views.push(view);
    expect(view.dom.textContent).toContain("non-numeric");
  });

  test("does not treat chartjs fences as chart blocks", () => {
    const view = createTestEditor("```chartjs\n{}\n```\n");
    views.push(view);
    expect(view.dom.querySelector(".cm-chart-widget")).toBeNull();
  });

  test("renders a valid frontmatter-backed chart", () => {
    const view = createTestEditor(markdownWithFrontmatterBackedChart);
    views.push(view);
    expect(view.dom.querySelector(".cm-chart-widget")).not.toBeNull();
  });

  test("keeps raw source visible and preview below when selection enters the chart block", () => {
    const view = createTestEditor(markdownWithChartFence);
    views.push(view);
    moveSelectionInsideChartFence(view);
    expect(view.dom.textContent).toContain("```chart");
    expect(view.dom.querySelector(".cm-chart-preview-below")).not.toBeNull();
  });

  test("updates rendered output when table values change", () => {
    const view = createTestEditor(markdownWithChartFence);
    views.push(view);
    updateTableValue(view, "19");
    expect(
      view.dom.querySelector(".cm-chart-widget")?.getAttribute("data-chart-summary"),
    ).toContain("19");
  });

  test("updates rendered output when frontmatter values change", () => {
    const view = createTestEditor(markdownWithFrontmatterBackedChart);
    views.push(view);
    updateFrontmatterValue(view, "19");
    expect(
      view.dom.querySelector(".cm-chart-widget")?.getAttribute("data-chart-summary"),
    ).toContain("19");
  });
});
