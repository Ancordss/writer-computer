import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet, WidgetType } from "@codemirror/view";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { ChartErrorWidget, ChartWidget, chartSummary } from "./chart-widget";
import { parseChartBlock } from "./chart-parser";
import { resolveChartSource } from "./chart-sources";
import { normalizeChartData } from "./chart-normalize";

interface ParsedFence {
  info: string;
  source: string;
}

type WidgetDom = HTMLElement & { __chartRoot?: Root };

function parseFencedCode(
  state: { doc: { sliceString(from: number, to: number): string } },
  node: {
    node: { firstChild: { name: string; from: number; to: number; nextSibling: any } | null };
  },
): ParsedFence | undefined {
  let info = "";
  let source = "";
  let child = node.node.firstChild;
  while (child) {
    if (child.name === "CodeInfo") info = state.doc.sliceString(child.from, child.to);
    if (child.name === "CodeText") source = state.doc.sliceString(child.from, child.to);
    child = child.nextSibling;
  }
  return info ? { info, source } : undefined;
}

function isChartFence(info: string) {
  return info.trim().split(/\s+/, 1)[0]?.toLowerCase() === "chart";
}

function selectionTouchesRange(state: EditorView["state"], from: number, to: number) {
  const main = state.selection.main;
  return main.from <= to && main.to >= from;
}

class ChartBlockWidget extends WidgetType {
  constructor(
    readonly note: string,
    readonly source: string,
    readonly previewBelow = false,
  ) {
    super();
  }

  eq(other: ChartBlockWidget): boolean {
    return (
      this.note === other.note &&
      this.source === other.source &&
      this.previewBelow === other.previewBelow
    );
  }

  toDOM() {
    const wrapper = document.createElement("div") as WidgetDom;
    wrapper.contentEditable = "false";
    wrapper.className = "cm-chart-mount";
    if (this.previewBelow) wrapper.classList.add("cm-chart-preview-below");
    const root = createRoot(wrapper);
    wrapper.__chartRoot = root;

    const config = parseChartBlock(this.source.trim());
    if ("code" in config) {
      flushSync(() => root.render(<ChartErrorWidget error={config} />));
      return wrapper;
    }

    const resolved = resolveChartSource(this.note, config.source);
    if ("code" in resolved) {
      flushSync(() => root.render(<ChartErrorWidget error={resolved} />));
      return wrapper;
    }

    const normalized = normalizeChartData(config, resolved);
    if ("code" in normalized) {
      flushSync(() => root.render(<ChartErrorWidget error={normalized} />));
      return wrapper;
    }

    wrapper.dataset.chartSummary = chartSummary(config, normalized);
    flushSync(() => root.render(<ChartWidget config={config} data={normalized} />));
    return wrapper;
  }

  destroy(dom: HTMLElement): void {
    (dom as WidgetDom).__chartRoot?.unmount();
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(
  state: EditorView["state"],
  getNoteText?: (body: string) => string,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const body = state.doc.toString();
  const note = getNoteText ? getNoteText(body) : body;

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "FencedCode") return;
      const parsed = parseFencedCode(state, node);
      if (!parsed || !isChartFence(parsed.info)) return;

      const isPreviewBelow = selectionTouchesRange(state, node.from, node.to);
      const widget = new ChartBlockWidget(note, parsed.source, isPreviewBelow);
      if (isPreviewBelow) {
        builder.add(
          node.to,
          node.to,
          Decoration.widget({
            widget,
            block: true,
            side: 1,
          }),
        );
        return;
      }

      builder.add(
        node.from,
        node.to,
        Decoration.replace({
          widget,
          block: true,
          inclusiveStart: true,
        }),
      );
    },
  });

  return builder.finish();
}

const chartTheme = EditorView.baseTheme({
  ".cm-chart-mount, .cm-chart-widget": {
    padding: "0.5em 0",
  },
  ".cm-chart-preview-below": {
    display: "block",
  },
  ".cm-chart-header": {
    marginBottom: "0.35em",
    fontSize: "0.85em",
    color: "var(--text-muted)",
  },
  ".cm-chart-svg": {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    height: "auto",
  },
  ".cm-chart-bar, .cm-chart-point": {
    fill: "var(--accent)",
  },
  ".cm-chart-line": {
    stroke: "var(--accent)",
    strokeWidth: "2",
    fill: "none",
  },
  ".cm-chart-point": {
    stroke: "var(--accent)",
    strokeWidth: "1",
  },
  ".cm-chart-axis": {
    stroke: "var(--line-subtle, #444)",
    strokeWidth: "1",
  },
  ".cm-chart-label": {
    fontSize: "9px",
    fill: "var(--text-muted)",
    fontFamily: "var(--ui-font)",
  },
  ".cm-chart-value-label": {
    fontSize: "8px",
    fill: "var(--text-primary, #fff)",
    fontFamily: "var(--ui-font)",
    fontWeight: "500",
  },
  ".cm-chart-slice-0": { fill: "var(--accent)" },
  ".cm-chart-slice-1": { fill: "color-mix(in srgb, var(--accent) 60%, var(--bg))" },
  ".cm-chart-slice-2": { fill: "color-mix(in srgb, var(--accent) 35%, var(--bg))" },
  ".cm-chart-slice-3": { fill: "var(--line-subtle, #555)" },
  ".cm-chart-slice-4": { fill: "var(--text-muted)" },
  ".cm-chart-error": {
    padding: "0.5em 0.75em",
    color: "var(--text-error, #ff6b6b)",
    backgroundColor: "var(--code-bg, #2d2d2d)",
    borderRadius: "6px",
    fontSize: "0.85em",
  },
});

export function chartDecorations(getNoteText?: (body: string) => string) {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, getNoteText);
    },
    update(_value, transaction) {
      return buildDecorations(transaction.state, getNoteText);
    },
    provide: (innerField) => EditorView.decorations.from(innerField),
  });

  return [field, chartTheme];
}
