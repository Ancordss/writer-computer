import { EditorSelection, EditorState } from "@codemirror/state";
import { forceParsing } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { GFM } from "@lezer/markdown";
import { chartDecorations } from "../../src/components/editor-area/chart-decorations";

export const markdownWithChartFence = [
  "<!-- chart-source: sales -->",
  "| month | revenue |",
  "|-------|---------|",
  "| Jan   | 12      |",
  "| Feb   | 18      |",
  "",
  "```chart",
  "type: bar",
  "source: table:sales",
  "x: month",
  "y: revenue",
  "title: Revenue",
  "```",
].join("\n");

export const markdownWithDuplicateIds = [
  "<!-- chart-source: sales -->",
  "| month | revenue |",
  "|-------|---------|",
  "| Jan   | 12      |",
  "",
  "<!-- chart-source: sales -->",
  "| month | revenue |",
  "|-------|---------|",
  "| Feb   | 18      |",
  "",
  "```chart",
  "type: bar",
  "source: table:sales",
  "x: month",
  "y: revenue",
  "```",
].join("\n");

export const markdownWithFrontmatterBackedChart = [
  "---",
  "stats:",
  "  revenue:",
  "    Jan: 12",
  "    Feb: 18",
  "---",
  "",
  "```chart",
  "type: line",
  "source: frontmatter:stats.revenue",
  "title: Revenue trend",
  "```",
].join("\n");

export const markdownWithNonNumericChartTable = [
  "<!-- chart-source: sales -->",
  "| month | revenue |",
  "|-------|---------|",
  "| Jan   | nope    |",
  "",
  "```chart",
  "type: bar",
  "source: table:sales",
  "x: month",
  "y: revenue",
  "```",
].join("\n");

export function createTestEditor(doc: string) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection: EditorSelection.cursor(0),
      extensions: [markdown({ extensions: [GFM] }), chartDecorations()],
    }),
  });
  forceParsing(view, view.state.doc.length, 1000);
  view.dispatch({ selection: view.state.selection });
  return view;
}

export function moveSelectionInsideChartFence(view: EditorView) {
  const pos = view.state.doc.toString().indexOf("type: bar");
  view.dispatch({ selection: { anchor: pos } });
}

export function updateTableValue(view: EditorView, nextValue: string) {
  const from = view.state.doc.toString().indexOf("18");
  view.dispatch({ changes: { from, to: from + 2, insert: nextValue } });
}

export function updateFrontmatterValue(view: EditorView, nextValue: string) {
  const from = view.state.doc.toString().indexOf("18");
  view.dispatch({ changes: { from, to: from + 2, insert: nextValue } });
}
