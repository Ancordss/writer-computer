# Markdown Data Charts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline bar, line, and pie charts to Writer from explicit `chart` fenced blocks backed by note-local markdown tables or frontmatter.

**Architecture:** Reuse Writer's existing CodeMirror fenced-block decoration pattern. Split the work into a pure chart-spec pipeline (`chart-parser`, `chart-sources`, `chart-normalize`, `chart-errors`) and a thin editor widget layer (`chart-decorations`, `chart-widget`) so parsing, validation, rendering, and editor integration remain independently testable.

**Tech Stack:** React 19, CodeMirror 6, `@prosemark/core`, existing `yaml` dependency, existing frontmatter helpers, inline SVG rendering, `vite-plus/test`.

---

## Chunk 1: Parsing and Data Contracts

### File Structure

- Create: `apps/desktop/src/components/editor-area/chart-markdown-table.ts`
  - Owns pure markdown-table parsing for chart source resolution.
- Create: `apps/desktop/src/components/editor-area/chart-errors.ts`
  - Owns shared chart error codes, messages, and helper constructors.
- Create: `apps/desktop/src/components/editor-area/chart-parser.ts`
  - Parses raw fenced `chart` block YAML into a validated config contract.
- Create: `apps/desktop/src/components/editor-area/chart-sources.ts`
  - Extracts labeled tables and frontmatter paths from the current note text.
- Create: `apps/desktop/src/components/editor-area/chart-normalize.ts`
  - Converts resolved table/frontmatter data into normalized chart rows.
- Test: `apps/desktop/tests/chart-parser.test.ts`
- Test: `apps/desktop/tests/chart-sources.test.ts`
- Test: `apps/desktop/tests/chart-normalize.test.ts`

### Task 1: Define shared chart error contracts

**Files:**

- Create: `apps/desktop/src/components/editor-area/chart-errors.ts`
- Test: `apps/desktop/tests/chart-parser.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, test } from "vite-plus/test";
import { chartError } from "../src/components/editor-area/chart-errors";

describe("chartError", () => {
  test("creates stable machine-readable errors", () => {
    expect(chartError("missing-source", 'Chart source "sales" was not found')).toEqual({
      code: "missing-source",
      message: 'Chart source "sales" was not found',
      location: undefined,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-parser.test.ts`
Expected: FAIL because `chart-errors.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `chart-errors.ts` with:

```ts
export type ChartErrorCode =
  | "invalid-config"
  | "missing-source"
  | "duplicate-source"
  | "missing-field"
  | "invalid-shape"
  | "non-numeric"
  | "empty-dataset";

export interface ChartSpecError {
  code: ChartErrorCode;
  message: string;
  location?: string;
}

export function chartError(
  code: ChartErrorCode,
  message: string,
  location?: string,
): ChartSpecError {
  return { code, message, location };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vp test apps/desktop/tests/chart-parser.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-errors.ts apps/desktop/tests/chart-parser.test.ts
git commit -m "feat: add chart error contract"
```

### Task 2: Parse and validate `chart` fenced block config

**Files:**

- Create: `apps/desktop/src/components/editor-area/chart-parser.ts`
- Modify: `apps/desktop/tests/chart-parser.test.ts`

- [ ] **Step 1: Write failing parser tests**

Add tests for:

```ts
test("parses a valid bar chart config", () => {
  expect(parseChartBlock(`type: bar\nsource: table:sales\nx: month\ny: revenue`)).toEqual({
    type: "bar",
    source: { kind: "table", id: "sales" },
    x: "month",
    y: "revenue",
    title: undefined,
  });
});

test("parses a valid frontmatter source config", () => {
  expect(
    parseChartBlock(`type: pie\nsource: frontmatter:stats.breakdown\nlabel: name\nvalue: total`),
  ).toEqual({
    type: "pie",
    source: { kind: "frontmatter", path: "stats.breakdown" },
    label: "name",
    value: "total",
    title: undefined,
  });
});

test("accepts selector-free frontmatter object-map configs", () => {
  expect(parseChartBlock(`type: line\nsource: frontmatter:stats.revenue`)).toEqual({
    type: "line",
    source: { kind: "frontmatter", path: "stats.revenue" },
    title: undefined,
  });
});

test("parses a valid bar config using label and value", () => {
  expect(parseChartBlock(`type: bar\nsource: table:sales\nlabel: month\nvalue: revenue`)).toEqual({
    type: "bar",
    source: { kind: "table", id: "sales" },
    label: "month",
    value: "revenue",
    title: undefined,
  });
});

test("rejects pie charts with x/y fields", () => {
  expect(parseChartBlock(`type: pie\nsource: table:sales\nx: month\ny: revenue`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects unknown chart types", () => {
  expect(parseChartBlock(`type: scatter\nsource: table:sales\nx: month\ny: revenue`)).toMatchObject(
    {
      code: "invalid-config",
    },
  );
});

test("rejects malformed YAML", () => {
  expect(parseChartBlock(`type: bar\nsource: [table:sales`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects missing required type", () => {
  expect(parseChartBlock(`source: table:sales\nx: month\ny: revenue`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects missing required source", () => {
  expect(parseChartBlock(`type: bar\nx: month\ny: revenue`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects non-object YAML configs", () => {
  expect(parseChartBlock(`- type: bar`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects wrong-typed source fields", () => {
  expect(parseChartBlock(`type: bar\nsource: 123\nx: month\ny: revenue`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects invalid source prefixes", () => {
  expect(parseChartBlock(`type: bar\nsource: query:sales\nx: month\ny: revenue`)).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects bar configs that specify both alias pairs", () => {
  expect(
    parseChartBlock(
      `type: bar\nsource: table:sales\nx: month\ny: revenue\nlabel: name\nvalue: total`,
    ),
  ).toMatchObject({ code: "invalid-config" });
});

test("rejects line configs without x and y", () => {
  expect(
    parseChartBlock(`type: line\nsource: table:sales\nlabel: month\nvalue: revenue`),
  ).toMatchObject({
    code: "invalid-config",
  });
});

test("rejects pie configs without label and value", () => {
  expect(parseChartBlock(`type: pie\nsource: table:sales\nx: month`)).toMatchObject({
    code: "invalid-config",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-parser.test.ts`
Expected: FAIL because `parseChartBlock` does not exist.

- [ ] **Step 3: Write minimal parser implementation**

In `chart-parser.ts`:

- parse YAML with the existing `yaml` dependency
- return either `ParsedChartConfig` or `ChartSpecError`
- split `source` into `{ kind: "table", id }` or `{ kind: "frontmatter", path }`
- validate allowed chart types
- validate only config-structure rules available at parse time:
  - `bar`: exactly one alias pair for selectable-column sources
  - `line`: `x` + `y` only
  - `pie`: `label` + `value` only
  - source-shape-dependent validation for frontmatter object maps happens later in `chart-normalize`
- reject YAML payloads that are not objects
- reject missing or wrong-typed `type` and `source` fields
- add a small helper like `isFrontmatterSource(config)` to keep later modules simple

- [ ] **Step 4: Run tests to verify they pass**

Run: `vp test apps/desktop/tests/chart-parser.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-parser.ts apps/desktop/tests/chart-parser.test.ts
git commit -m "feat: parse chart block configs"
```

### Task 3: Resolve labeled tables and frontmatter paths from note text

**Files:**

- Create: `apps/desktop/src/components/editor-area/chart-sources.ts`
- Create: `apps/desktop/src/components/editor-area/chart-markdown-table.ts`
- Test: `apps/desktop/tests/chart-sources.test.ts`

Resolved-source fixtures for tests:

- `noteWithDuplicateIds`

```md
<!-- chart-source: sales -->

| month | revenue |
| ----- | ------- |
| Jan   | 12      |

<!-- chart-source: sales -->

| month | revenue |
| ----- | ------- |
| Feb   | 18      |
```

- `noteWithFrontmatter`

```md
---
stats:
  revenue:
    jan: 12
    feb: 18
  breakdown:
    - name: Draft
      total: 3
    - name: Edit
      total: 2
---
```

- [ ] **Step 1: Write failing source-resolution tests**

Add tests for:

```ts
test("finds a labeled table immediately below a chart-source comment", () => {
  const note = [
    "<!-- chart-source: sales -->",
    "| month | revenue |",
    "|-------|---------|",
    "| Jan   | 12      |",
  ].join("\n");

  expect(resolveChartSource(note, { kind: "table", id: "sales" })).toMatchObject({
    kind: "table",
    headers: ["month", "revenue"],
  });
});

test("rejects duplicate chart-source ids", () => {
  expect(resolveChartSource(noteWithDuplicateIds, { kind: "table", id: "sales" })).toMatchObject({
    code: "duplicate-source",
  });
});

test("does not associate a marker when a blank line separates it from the table", () => {
  const note = [
    "<!-- chart-source: sales -->",
    "",
    "| month | revenue |",
    "|-------|---------|",
    "| Jan   | 12      |",
  ].join("\n");

  expect(resolveChartSource(note, { kind: "table", id: "sales" })).toMatchObject({
    code: "missing-source",
  });
});

test("does not associate a marker when another non-empty line sits between the marker and table", () => {
  const note = [
    "<!-- chart-source: sales -->",
    "paragraph",
    "| month | revenue |",
    "|-------|---------|",
    "| Jan   | 12      |",
  ].join("\n");

  expect(resolveChartSource(note, { kind: "table", id: "sales" })).toMatchObject({
    code: "missing-source",
  });
});

test("resolves dot-separated frontmatter paths", () => {
  expect(
    resolveChartSource(noteWithFrontmatter, { kind: "frontmatter", path: "stats.revenue" }),
  ).toMatchObject({
    kind: "frontmatter",
    value: { jan: 12, feb: 18 },
  });
});

test("fails when an intermediate frontmatter key is missing", () => {
  expect(
    resolveChartSource(noteWithFrontmatter, { kind: "frontmatter", path: "stats.missing.monthly" }),
  ).toMatchObject({
    code: "missing-source",
  });
});

test("fails when a frontmatter path uses array indexing", () => {
  expect(
    resolveChartSource(noteWithFrontmatter, { kind: "frontmatter", path: "stats.revenue.0" }),
  ).toMatchObject({
    code: "missing-source",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-sources.test.ts`
Expected: FAIL because `resolveChartSource` does not exist.

- [ ] **Step 3: Write minimal source resolver implementation**

In `chart-sources.ts`:

- parse frontmatter with the existing `parseDocument`/`parseFrontmatter` helpers so chart resolution stays aligned with Writer's canonical frontmatter behavior
- scan the markdown body for `<!-- chart-source: id -->` markers
- associate a marker only when the next non-empty line starts the table and there is no blank line in between
- detect duplicate ids across the note before returning a table
- parse markdown tables in the new pure helper `chart-markdown-table.ts`; do not couple the source pipeline to `table-decorations.ts`
- resolve frontmatter paths using dot-separated object traversal only; return `missing-source` for any broken segment

- [ ] **Step 4: Run tests to verify they pass**

Run: `vp test apps/desktop/tests/chart-sources.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-sources.ts apps/desktop/src/components/editor-area/chart-markdown-table.ts apps/desktop/tests/chart-sources.test.ts
git commit -m "feat: resolve chart data sources"
```

### Task 4: Normalize resolved data into chart rows

**Files:**

- Create: `apps/desktop/src/components/editor-area/chart-normalize.ts`
- Create: `apps/desktop/tests/chart-normalize.test.ts`

Normalization fixtures for tests:

```ts
const barConfig = { type: "bar", source: { kind: "table", id: "sales" }, x: "month", y: "revenue" };
const lineConfig = {
  type: "line",
  source: { kind: "table", id: "sales" },
  x: "month",
  y: "revenue",
};
const pieConfig = {
  type: "pie",
  source: { kind: "frontmatter", path: "stats.breakdown" },
  label: "name",
  value: "total",
};
const objectMapLineConfig = {
  type: "line",
  source: { kind: "frontmatter", path: "stats.revenue" },
};
const objectMapPieConfig = { type: "pie", source: { kind: "frontmatter", path: "stats.status" } };
const objectMapBarConfigWithXY = {
  type: "bar",
  source: { kind: "frontmatter", path: "stats.revenue" },
  x: "month",
  y: "revenue",
};

const resolvedTable = {
  kind: "table",
  headers: ["month", "revenue"],
  rows: [
    ["Jan", "12"],
    ["Feb", "18"],
  ],
};
const emptyResolvedTable = { kind: "table", headers: ["month", "revenue"], rows: [] };
const resolvedTableWithStringNumbers = {
  kind: "table",
  headers: ["month", "revenue"],
  rows: [["Jan", "12.5"]],
};
const resolvedTableWithTextValues = {
  kind: "table",
  headers: ["month", "revenue"],
  rows: [["Jan", "twelve"]],
};
const resolvedObjectMap = { kind: "frontmatter", value: { draft: 3, edit: 2 } };
const resolvedRevenueObjectMap = { kind: "frontmatter", value: { Jan: 12, Feb: 18 } };
const emptyResolvedFrontmatterObject = { kind: "frontmatter", value: {} };
const emptyResolvedFrontmatterArray = { kind: "frontmatter", value: [] };
const resolvedFrontmatterArray = {
  kind: "frontmatter",
  value: [
    { month: "Jan", revenue: 12 },
    { month: "Feb", revenue: 18 },
  ],
};
const resolvedFrontmatterArrayMissingY = {
  kind: "frontmatter",
  value: [{ month: "Jan" }],
};
const resolvedScalarFrontmatter = { kind: "frontmatter", value: 12 };
```

- [ ] **Step 1: Write failing normalization tests**

Add tests for:

```ts
test("normalizes table rows for bar charts", () => {
  expect(normalizeChartData(barConfig, resolvedTable)).toEqual({
    kind: "xy",
    rows: [
      { x: "Jan", y: 12 },
      { x: "Feb", y: 18 },
    ],
  });
});

test("normalizes selector-free object-map frontmatter for line charts", () => {
  expect(normalizeChartData(objectMapLineConfig, resolvedRevenueObjectMap)).toEqual({
    kind: "xy",
    rows: [
      { x: "Jan", y: 12 },
      { x: "Feb", y: 18 },
    ],
  });
});

test("normalizes selector-free object-map frontmatter for pie charts", () => {
  expect(normalizeChartData(objectMapPieConfig, resolvedObjectMap)).toEqual({
    kind: "slice",
    rows: [
      { label: "draft", value: 3 },
      { label: "edit", value: 2 },
    ],
  });
});

test("fails on empty datasets", () => {
  expect(normalizeChartData(barConfig, emptyResolvedTable)).toMatchObject({
    code: "empty-dataset",
  });
});

test("fails on empty frontmatter object maps", () => {
  expect(normalizeChartData(objectMapLineConfig, emptyResolvedFrontmatterObject)).toMatchObject({
    code: "empty-dataset",
  });
});

test("fails on empty frontmatter arrays", () => {
  expect(normalizeChartData(lineConfig, emptyResolvedFrontmatterArray)).toMatchObject({
    code: "empty-dataset",
  });
});

test("normalizes frontmatter array-of-object rows for line charts", () => {
  expect(normalizeChartData(lineConfig, resolvedFrontmatterArray)).toEqual({
    kind: "xy",
    rows: [
      { x: "Jan", y: 12 },
      { x: "Feb", y: 18 },
    ],
  });
});

test("fails when a required field is missing from a frontmatter object row", () => {
  expect(normalizeChartData(lineConfig, resolvedFrontmatterArrayMissingY)).toMatchObject({
    code: "missing-field",
  });
});

test("fails when a required table column is missing", () => {
  expect(
    normalizeChartData(barConfig, { kind: "table", headers: ["month"], rows: [["Jan"]] }),
  ).toMatchObject({
    code: "missing-field",
  });
});

test("fails when a frontmatter path resolves to an unsupported scalar", () => {
  expect(normalizeChartData(barConfig, resolvedScalarFrontmatter)).toMatchObject({
    code: "invalid-shape",
  });
});

test("fails when an object-map source incorrectly provides field selectors", () => {
  expect(normalizeChartData(objectMapBarConfigWithXY, resolvedObjectMap)).toMatchObject({
    code: "invalid-shape",
  });
});

test("coerces numeric-looking strings to numbers", () => {
  expect(normalizeChartData(barConfig, resolvedTableWithStringNumbers)).toEqual({
    kind: "xy",
    rows: [{ x: "Jan", y: 12.5 }],
  });
});

test("fails on non-numeric values", () => {
  expect(normalizeChartData(barConfig, resolvedTableWithTextValues)).toMatchObject({
    code: "non-numeric",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-normalize.test.ts`
Expected: FAIL because `normalizeChartData` does not exist.

- [ ] **Step 3: Write minimal normalizer implementation**

In `chart-normalize.ts`:

- define the normalized output type:

```ts
type NormalizedChartData =
  | { kind: "xy"; rows: Array<{ x: string; y: number }> }
  | { kind: "slice"; rows: Array<{ label: string; value: number }> };
```

- coerce only numeric-looking strings (`"12"`, `"12.5"`) to numbers
- reject empty strings, `NaN`, and non-numeric text as `non-numeric`
- preserve source order exactly
- enforce chart-type-compatible shapes only
- reject frontmatter object-map configs that incorrectly provide field selectors
- surface `missing-field` when a named table column or frontmatter object key is absent
- surface `invalid-shape` for unsupported scalar or heterogeneous frontmatter shapes

- [ ] **Step 4: Run tests to verify they pass**

Run: `vp test apps/desktop/tests/chart-normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-normalize.ts apps/desktop/tests/chart-normalize.test.ts
git commit -m "feat: normalize chart data"
```

### Task 4.5: Verify the full pure-data pipeline together

**Files:**

- Verify: `apps/desktop/tests/chart-parser.test.ts`
- Verify: `apps/desktop/tests/chart-sources.test.ts`
- Verify: `apps/desktop/tests/chart-normalize.test.ts`

- [ ] **Step 1: Run all pure-data chart tests together**

Run: `vp test apps/desktop/tests/chart-parser.test.ts apps/desktop/tests/chart-sources.test.ts apps/desktop/tests/chart-normalize.test.ts`
Expected: PASS.

- [ ] **Step 2: Run type/lint validation for the pure-data chunk**

Run: `vp check`
Expected: PASS.

## Chunk 2: Editor Rendering and Integration

### File Structure

- Create: `apps/desktop/src/components/editor-area/chart-widget.tsx`
  - Exports pure React components that render SVG bar, line, pie, and inline error widgets from normalized data.
- Create: `apps/desktop/src/components/editor-area/chart-decorations.ts`
  - Detects `chart` fenced blocks, mounts `chart-widget.tsx` into DOM widgets, and owns chart-specific `EditorView.baseTheme` styles.
- Modify: `apps/desktop/src/components/editor-area/use-prosemark-editor.ts`
  - Register chart decorations alongside Mermaid, tables, and HTML block widgets.
- Create: `apps/desktop/tests/helpers/chart-editor.ts`
  - Owns editor test harness helpers and sample markdown fixtures for chart decoration tests.
- Test: `apps/desktop/tests/chart-widget.test.tsx`
- Test: `apps/desktop/tests/chart-decorations.test.ts`

### Task 5: Render inline SVG chart widgets

**Files:**

- Create: `apps/desktop/src/components/editor-area/chart-widget.tsx`
- Create: `apps/desktop/tests/chart-widget.test.tsx`

- [ ] **Step 1: Write failing widget tests**

Add tests for:

```tsx
test("renders a bar chart as svg", () => {
  render(
    <ChartWidget
      config={{ type: "bar", title: "Revenue" }}
      data={{ kind: "xy", rows: [{ x: "Jan", y: 12 }] }}
    />,
  );

  expect(screen.getByRole("img", { name: /revenue/i })).toBeInTheDocument();
});

test("renders a line chart as svg", () => {
  render(
    <ChartWidget
      config={{ type: "line", title: "Trend" }}
      data={{
        kind: "xy",
        rows: [
          { x: "Jan", y: 12 },
          { x: "Feb", y: 18 },
        ],
      }}
    />,
  );

  expect(screen.getByRole("img", { name: /trend/i })).toBeInTheDocument();
});

test("renders a pie chart as svg", () => {
  render(
    <ChartWidget
      config={{ type: "pie", title: "Breakdown" }}
      data={{ kind: "slice", rows: [{ label: "Draft", value: 3 }] }}
    />,
  );

  expect(screen.getByRole("img", { name: /breakdown/i })).toBeInTheDocument();
});

test("renders an inline error panel", () => {
  render(
    <ChartErrorWidget
      error={{ code: "missing-source", message: 'Chart source "sales" was not found' }}
    />,
  );
  expect(screen.getByText(/sales/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-widget.test.tsx`
Expected: FAIL because `chart-widget.tsx` does not exist.

- [ ] **Step 3: Write minimal SVG renderer implementation**

In `chart-widget.tsx`:

- render bar, line, and pie charts as small inline SVGs
- compute simple scales in module-local helpers
- use the chart title, or a fallback like `Chart preview`, for `aria-label`
- export a separate `ChartErrorWidget` that renders the shared inline error treatment
- keep rendering pure: no markdown parsing and no editor state reads

- [ ] **Step 4: Run tests to verify they pass**

Run: `vp test apps/desktop/tests/chart-widget.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-widget.tsx apps/desktop/tests/chart-widget.test.tsx
git commit -m "feat: render inline chart widgets"
```

### Task 6: Detect `chart` fences and connect the full pipeline

**Files:**

- Create: `apps/desktop/src/components/editor-area/chart-decorations.ts`
- Modify: `apps/desktop/src/components/editor-area/use-prosemark-editor.ts`
- Create: `apps/desktop/tests/helpers/chart-editor.ts`
- Create: `apps/desktop/tests/chart-decorations.test.ts`

- [ ] **Step 1: Write failing decoration tests**

Add tests for:

````ts
// Reuse helpers/fixtures from apps/desktop/tests/helpers/chart-editor.ts

test("replaces a valid chart fence when selection is outside the block", () => {
  const view = createTestEditor(markdownWithChartFence);
  expect(view.dom.querySelector(".cm-chart-widget")).not.toBeNull();
  expect(view.dom.textContent).not.toContain("```chart");
});

test("shows an error widget for duplicate table ids", () => {
  const view = createTestEditor(markdownWithDuplicateIds);
  expect(view.dom.textContent).toContain("duplicate");
});

test("shows an error widget for invalid chart config", () => {
  const view = createTestEditor(
    "```chart\ntype: pie\nsource: table:sales\nx: month\ny: revenue\n```",
  );
  expect(view.dom.textContent).toContain("invalid");
});

test("shows an error widget for normalization failures", () => {
  const view = createTestEditor(markdownWithNonNumericChartTable);
  expect(view.dom.textContent).toContain("non-numeric");
});

test("leaves non-chart fenced blocks untouched", () => {
  const view = createTestEditor("```js\nconsole.log('hi')\n```");
  expect(view.dom.querySelector(".cm-chart-widget")).toBeNull();
});

test("does not treat chartjs fences as chart blocks", () => {
  const view = createTestEditor("```chartjs\n{}\n```");
  expect(view.dom.querySelector(".cm-chart-widget")).toBeNull();
});

test("renders a valid frontmatter-backed chart", () => {
  const view = createTestEditor(markdownWithFrontmatterBackedChart);
  expect(view.dom.querySelector(".cm-chart-widget")).not.toBeNull();
});
````

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-decorations.test.ts`
Expected: FAIL because chart decorations are not registered.

- [ ] **Step 3: Write minimal decoration implementation**

In `chart-decorations.ts`:

- copy the working fenced-code detection pattern from `mermaid-decorations.ts`
- detect only fenced blocks whose first info token is exactly `chart`
- when the selection is outside the block, replace the full fence with a widget
- when the selection is inside the block, leave raw text visible and append the preview widget below the block
- pipe raw note text and the fenced block source through:
  - `parseChartBlock`
  - `resolveChartSource`
  - `normalizeChartData`
  - `ChartWidget` or `ChartErrorWidget`
- keep errors local to the block; never throw from the widget pipeline
- mount the React chart widget into the widget DOM root in the same style as other editor-side rich widgets
- keep chart-specific styles in `EditorView.baseTheme` inside `chart-decorations.ts`, following the existing Mermaid/table/html pattern

- [ ] **Step 4: Register the extension in the editor**

In `use-prosemark-editor.ts`:

- import `chartDecorations`
- register it near `mermaidDecorations`, `tableDecorations`, and `htmlBlockDecorations`
- keep the existing editor ordering unless tests show a specific interaction problem

- [ ] **Step 5: Run tests to verify they pass**

Run: `vp test apps/desktop/tests/chart-decorations.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-decorations.ts apps/desktop/src/components/editor-area/use-prosemark-editor.ts apps/desktop/tests/helpers/chart-editor.ts apps/desktop/tests/chart-decorations.test.ts
git commit -m "feat: render charts from fenced markdown blocks"
```

### Task 7: Add chart styling and document-level regressions

**Files:**

- Modify: `apps/desktop/src/components/editor-area/chart-decorations.ts`
- Modify: `apps/desktop/tests/chart-decorations.test.ts`

- [ ] **Step 1: Write failing regression assertions**

Add tests for:

````ts
test("keeps raw source available when selection enters the chart block", () => {
  const view = createTestEditor(markdownWithChartFence);
  moveSelectionInsideChartFence(view);
  expect(view.dom.textContent).toContain("```chart");
  expect(view.dom.querySelector(".cm-chart-widget")).not.toBeNull();
  expect(view.dom.querySelector(".cm-chart-preview-below")).not.toBeNull();
});

test("updates rendered output when table values change", () => {
  const view = createTestEditor(markdownWithChartFence);
  updateTableValue(view, "18");
  expect(view.dom.querySelector(".cm-chart-widget")?.getAttribute("data-chart-summary")).toContain(
    "18",
  );
});

test("updates rendered output when frontmatter values change", () => {
  const view = createTestEditor(markdownWithFrontmatterBackedChart);
  updateFrontmatterValue(view, "18");
  expect(view.dom.querySelector(".cm-chart-widget")?.getAttribute("data-chart-summary")).toContain(
    "18",
  );
});
````

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test apps/desktop/tests/chart-decorations.test.ts`
Expected: FAIL because the update assertion signal (`aria-label` or `data-chart-summary`) and/or re-render behavior is not implemented yet.

- [ ] **Step 3: Write minimal styles and any small integration fixes**

In `chart-decorations.ts`:

- add `.cm-chart-widget` layout styles
- add SVG sizing rules so charts fit the editor width without distortion
- add an inline error style consistent with Mermaid/table chrome
- add a class such as `.cm-chart-preview-below` for the preview-while-editing state

In the widget/decorations layer:

- keep `aria-label` reserved for the accessible chart name
- expose `data-chart-summary` on `.cm-chart-widget` for update assertions and tests
- use a deterministic summary format: `type=<type>;points=<count>;values=<comma-separated numeric values>`

Only make the smallest code fixes needed to satisfy the regression tests. If those fixes touch `chart-decorations.ts`, `chart-widget.tsx`, or `use-prosemark-editor.ts`, stage them in the commit.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `vp test apps/desktop/tests/chart-widget.test.tsx apps/desktop/tests/chart-decorations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/editor-area/chart-decorations.ts apps/desktop/src/components/editor-area/chart-widget.tsx apps/desktop/src/components/editor-area/use-prosemark-editor.ts apps/desktop/tests/chart-decorations.test.ts
git commit -m "feat: polish inline chart rendering"
```

### Task 8: Final validation and docs sync

**Files:**

- Modify: `CHANGELOG.md`
- Verify: `docs/superpowers/specs/2026-05-05-markdown-data-charts-design.md`

- [ ] **Step 1: Add changelog entry**

Add a short user-visible entry describing markdown data charts, supported chart types, and inline error behavior.

- [ ] **Step 2: Confirm implementation still matches the approved spec**

Re-read `docs/superpowers/specs/2026-05-05-markdown-data-charts-design.md` and verify:

- chart sources are note-local only
- supported chart types are only `bar`, `line`, and `pie`
- duplicate table IDs fail visibly
- non-`chart` fenced blocks remain unaffected
- caret-inside behavior keeps raw source visible and shows a preview below the block
- invalid configs and invalid data render local inline errors
- table and frontmatter edits re-render the chart preview

If behavior intentionally changed during implementation, update the spec in the same change. This includes the implementation decision to keep chart widget styling in `chart-decorations.ts` via `EditorView.baseTheme` instead of `prosemark-theme.css`.

- [ ] **Step 3: Run targeted tests**

Run: `vp test apps/desktop/tests/chart-parser.test.ts apps/desktop/tests/chart-sources.test.ts apps/desktop/tests/chart-normalize.test.ts apps/desktop/tests/chart-widget.test.tsx apps/desktop/tests/chart-decorations.test.ts`
Expected: PASS.

- [ ] **Step 4: Run repo validation**

Run: `vp check`
Expected: PASS.

- [ ] **Step 5: Run broader desktop tests if focused tests passed cleanly**

Run: `vp test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add CHANGELOG.md docs/superpowers/specs/2026-05-05-markdown-data-charts-design.md
git commit -m "feat: add markdown data charts"
```
