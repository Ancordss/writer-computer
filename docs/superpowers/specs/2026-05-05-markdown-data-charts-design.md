# Markdown Data Charts Design

## Summary

Add inline chart rendering to Writer so notes can turn markdown-authored data into charts inside the editor. The source of truth stays in plain markdown: users write normal frontmatter and/or markdown tables, then add an explicit fenced `chart` block that references that data. Writer renders bar, line, and pie charts inline and shows clear inline errors when the chart config or source data is invalid.

## Goals

- Support explicit fenced `chart` blocks as the only chart rendering trigger in v1.
- Let charts resolve data from the current note's markdown tables and frontmatter.
- Support `bar`, `line`, and `pie` chart types in v1.
- Keep the raw markdown unchanged; charts are a rendered view, not a transformed document model.
- Fail visibly and locally with inline errors while preserving the source markdown.
- Keep the feature deterministic and easy for AI agents to author correctly.

## Non-Goals

- A visual chart builder UI.
- Drag-to-edit, resize, or interactively manipulate charts.
- Cross-note or workspace-wide chart sources.
- External data fetching.
- Auto-detecting charts from arbitrary tables.
- Advanced chart types beyond bar, line, and pie.
- Export-specific chart guarantees in v1.

## Authoring Model

Charts are declared with an explicit fenced `chart` block. The block stores chart configuration only; the data continues to live in standard markdown structures.

Example:

````md
---
stats:
  revenue:
    jan: 12
    feb: 18
    mar: 15
---

<!-- chart-source: quarterly-trend -->

| month | revenue |
| ----- | ------- |
| Jan   | 12      |
| Feb   | 18      |
| Mar   | 15      |

```chart
type: bar
source: table:quarterly-trend
x: month
y: revenue
title: Quarterly revenue
```
````

````

### Chart Block Fields

Required:

- `type`
- `source`

Optional in v1:

- `title`
- `x`
- `y`
- `label`
- `value`

The config payload is parsed as YAML.

Field rules by chart type:

- `bar`
  - table sources require either `x` + `y`, or `label` + `value`
  - frontmatter object-map sources require no field-name keys; the map's keys and values are used directly
  - frontmatter array-of-object sources require either `x` + `y`, or `label` + `value`
- `line`
  - table and frontmatter array-of-object sources require `x` + `y`
  - frontmatter object-map sources require no field-name keys; the map's keys and values are used directly as `x` and `y`
- `pie`
  - table and frontmatter array-of-object sources require `label` + `value`
  - frontmatter object-map sources require no field-name keys; the map's keys and values are used directly as `label` and `value`

The pairs are aliases for the same internal roles:

- `x` and `label` both identify the categorical key
- `y` and `value` both identify the numeric key

Validation rules:

- `line` rejects `label`/`value`-only config; the canonical form is `x` + `y`
- `pie` rejects `x`/`y` fields entirely; the canonical form is `label` + `value`
- `bar` may use either pair, but not both in the same block
- for table and frontmatter array-of-object sources, supplying both alias pairs is an error rather than a precedence rule
- for frontmatter object-map sources, supplying any of `x`, `y`, `label`, or `value` is an error because the data shape is implicit

### Source References

`source` may point to:

- `table:<id>` for a labeled markdown table
- `frontmatter:<path>` for a frontmatter path within the current note

Tables must be labeled explicitly with an HTML comment marker immediately above the table:

```md
<!-- chart-source: quarterly-trend -->
| month | revenue |
|-------|---------|
| Jan   | 12      |
````

Rules for table labels:

- the comment must be the closest non-empty line immediately above the table
- blank lines between the marker and the table break the association
- ids must be unique within a note
- duplicate ids are a hard source-resolution error for every chart referencing that id

This is a Writer-defined convention, not a markdown standard. It is chosen because it is valid markdown, portable in plain-text workflows, and much safer than positional inference.

## Source Resolution

The renderer resolves each `chart` block in three stages.

### 1. Parse Config

Parse the fenced `chart` block as a small YAML config payload. Invalid config fails immediately and renders an inline error.

### 2. Resolve Source Data

Resolve `source` against the current note content.

- `table:<id>` looks up a labeled markdown table in the current document.
- `frontmatter:<path>` resolves a structured value from parsed frontmatter.

Frontmatter path syntax:

- dot-separated keys only in v1, for example `stats.revenue.monthly`
- each segment must resolve through nested objects
- missing intermediate keys are a source-resolution error
- array indexing is not supported in v1

Accepted source shapes in v1:

- Tables
  - header row plus one or more data rows
  - row order is the display order for bar, line, and pie charts
  - an empty table after parsing is an inline error
- Frontmatter
  - object map: `{ jan: 12, feb: 18 }`
  - array of objects: `[{ month: "Jan", revenue: 12 }, { month: "Feb", revenue: 18 }]`
  - arrays preserve their given order
  - object maps preserve the parser's key order as authored in the file
  - empty arrays or empty objects are inline errors

Frontmatter shapes not supported in v1:

- array of tuples
- nested heterogeneous arrays
- scalar values
- mixed-type objects whose values cannot be normalized to one chart series

### 3. Normalize Data

Normalize the resolved source into a small internal row shape before rendering.

Examples:

```ts
[{ x: "Jan", y: 12 }][{ label: "Drafting", value: 42 }];
```

This isolates markdown parsing from chart rendering and makes errors precise and reusable across chart types.

Normalization rules:

- `table:<id>` with `x` + `y`
  - read the named columns from each row and emit `{ x, y }`
- `table:<id>` with `label` + `value`
  - read the named columns from each row and emit `{ label, value }`
- `frontmatter:<path>` object map
  - for `bar` or `line`, emit `{ x: key, y: value }`
  - for `pie`, emit `{ label: key, value: value }`
  - object-map charts must not provide field-name keys in config because there are no named columns to select from
- `frontmatter:<path>` array of objects
  - requires config keys naming the source fields to read from each object
  - emit the corresponding normalized rows in array order

Ordering rules:

- table-backed charts preserve table row order
- frontmatter arrays preserve array order
- frontmatter object maps preserve authored key order
- no implicit sorting is applied in v1

## Rendering Behavior

Charts should follow the same broad model as Writer's existing rich fenced-block rendering such as Mermaid.

- A valid `chart` block renders as an inline widget in the document flow.
- The raw fenced block remains the persisted source of truth.
- When the caret is inside the block, Writer may prefer the raw text-editing view; when the caret is outside, it renders the chart preview.
- Editing a table or frontmatter source automatically updates dependent chart previews.
- There is no GUI chart builder in v1.
- There are no hidden transforms or side effects.

## Chart Types

### Bar

- Requires category and numeric value data.
- Valid config:
  - `x` + `y`
  - `label` + `value`
- Valid sources:
  - labeled table
  - frontmatter object map
  - frontmatter array of objects

### Line

- Requires ordered x/y style data.
- Uses the same normalized row contract as bar wherever practical.
- Valid config:
  - `x` + `y` only
- Valid sources:
  - labeled table
  - frontmatter object map
  - frontmatter array of objects

### Pie

- Requires label/value data.
- Rejects ambiguous multi-series shapes in v1.
- Valid config:
  - `label` + `value` only
- Valid sources:
  - labeled table
  - frontmatter object map
  - frontmatter array of objects

## Error Handling

Failure must be visible, local, and reversible.

Rules:

- Never rewrite or delete the raw markdown because chart rendering fails.
- Render errors inline at the chart location.
- Prefer explicit failure over heuristic repair or silent row dropping.
- Treat malformed charts as document-content problems, not app-fatal errors.

Error classes:

- Invalid chart config
- Missing source reference
- Missing required columns or fields
- Unsupported data shape for the selected chart type
- Non-numeric values where numeric data is required
- Empty dataset after resolution

Example messages:

- `Unknown chart type "scatter"`
- `Chart source "quarterly-trend" was not found`
- `Line chart requires x and y fields`
- `Column "revenue" contains non-numeric values`
- `Frontmatter path "stats.revenue" does not resolve to chartable data`
- `Chart source "quarterly-trend" resolved to an empty dataset`

## Architecture

This feature should reuse the existing markdown-special-block rendering pattern rather than introduce a separate document subsystem.

Rendering technology:

- render charts as inline SVG widgets in v1
- do not add a new charting dependency for v1
- build the small bar, line, and pie renderers directly in Writer, following the existing inline-SVG widget pattern already used for Mermaid output
- this keeps bundle impact and styling control predictable and matches the narrow chart-type scope

Proposed pieces:

- chart block parser
- source resolver for labeled tables and frontmatter paths
- data normalizer that converts resolved content into an internal dataset shape
- chart widget renderer for bar, line, and pie
- error widget renderer for invalid configs or source data

Module contracts:

- `chart-parser`
  - input: raw fenced block text
  - output: `ParsedChartConfig | ChartSpecError`
- `chart-sources`
  - input: current note text plus a resolved source reference from parsed config
  - output: `ResolvedTableSource | ResolvedFrontmatterSource | ChartSpecError`
- `chart-normalize`
  - input: parsed config plus resolved source
  - output: `NormalizedChartData | ChartSpecError`
- `chart-widget`
  - input: `ParsedChartConfig` plus `NormalizedChartData`, or a `ChartSpecError`
  - output: rendered chart widget or rendered inline error widget

Shared error shape:

- `code`: stable machine-readable error code
- `message`: user-visible inline message
- `location`: optional block-relative detail for debugging

Flow:

1. Detect fenced `chart` blocks in the editor.
2. Parse block config.
3. Extract note-local source candidates from frontmatter and labeled tables.
4. Resolve the referenced source.
5. Normalize the data.
6. Render the chart widget.
7. Render an inline error widget instead if any step fails.

Separation of concerns:

- source extraction should not know about SVG or chart drawing
- chart components should not parse markdown
- error formatting should be centralized for consistency

## Files Expected To Change

- `apps/desktop/src/components/editor-area/use-prosemark-editor.ts` - register the new chart decorations/extension
- `apps/desktop/src/components/editor-area/chart-decorations.tsx` (new) - detect `chart` fences, mount widgets, and own chart widget editor styles
- `apps/desktop/src/components/editor-area/chart-parser.ts` (new) - parse `chart` block config
- `apps/desktop/src/components/editor-area/chart-sources.ts` (new) - resolve labeled tables and frontmatter paths from the current note
- `apps/desktop/src/components/editor-area/chart-normalize.ts` (new) - normalize resolved data into internal chart rows
- `apps/desktop/src/components/editor-area/chart-widget.tsx` (new) - render bar, line, and pie charts plus error states
- `apps/desktop/src/components/editor-area/chart-errors.ts` (new) - shared chart error types and helpers
- tests under `apps/desktop/tests/` for config parsing, source resolution, normalization, and error rendering

## Testing Strategy

Focus tests on the authoring and rendering contract, not just screenshots.

- Parse valid and invalid `chart` blocks.
- Resolve labeled tables correctly.
- Resolve frontmatter paths correctly.
- Normalize supported source shapes for bar, line, and pie charts.
- Fail with stable, visible messages for invalid config or invalid data.
- Reject duplicate table ids and empty datasets with stable messages.
- Re-render when note content changes.
- Preserve raw fenced source behavior while rendering chart or error widgets.

## Acceptance Criteria

- A user can write a labeled markdown table and a `chart` block referencing it, and see an inline bar, line, or pie chart.
- A user can reference frontmatter data and render a supported chart.
- Editing table or frontmatter source data updates the chart preview without reload.
- Invalid chart blocks render a visible inline error without losing the source markdown.
- Non-`chart` fenced blocks are unaffected.
- Chart rendering stays deterministic so AI-authored notes either render correctly or fail with a precise inline reason.

## Follow-Ups

- Add more chart types such as area or scatter.
- Add a helper command to insert a chart block template.
- Add cross-note or workspace data sources if the local note model proves valuable first.
- Add export behavior once the inline authoring model is stable.
