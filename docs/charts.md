# Charts

Writer renders inline charts from data already in your note. You write a fenced `chart` block that points at a markdown table or frontmatter value, and Writer draws a bar, line, or pie chart in the editor.

## Quick start

Write a labeled table and a chart block that references it:

````md
<!-- chart-source: sales -->

| month | revenue |
| ----- | ------- |
| Jan   | 12      |
| Feb   | 18      |
| Mar   | 15      |

```chart
type: bar
source: table:sales
x: month
y: revenue
title: Monthly revenue
```
````

````

The chart renders inline when your cursor is outside the block. Move your cursor into the block to edit the raw config.

## Chart block fields

| Field    | Required | Description                                          |
|----------|----------|------------------------------------------------------|
| `type`   | yes      | `bar`, `line`, or `pie`                              |
| `source` | yes      | `table:<id>` or `frontmatter:<path>`                 |
| `title`  | no       | Chart heading shown above the visualization          |
| `x`      | no       | Column or field name for the category axis           |
| `y`      | no       | Column or field name for the numeric axis            |
| `label`  | no       | Column or field name for pie slice labels            |
| `value`  | no       | Column or field name for pie slice values            |
| `width`  | no       | Chart width in viewBox units (default: 300, pie: 240)|
| `height` | no       | Chart height in viewBox units (default: 180)         |

## Data sources

### Markdown tables

Label a table with an HTML comment directly above it:

```md
<!-- chart-source: my-data -->
| category | count |
|----------|-------|
| A        | 10    |
| B        | 20    |
````

Then reference it with `source: table:my-data`.

- The comment must be the closest non-empty content above the table
- IDs must be unique within a note
- Blank lines between the comment and table are fine

### Frontmatter

Reference nested frontmatter values with dot-separated paths:

```yaml
---
stats:
  revenue:
    Jan: 12
    Feb: 18
---
```

Then reference it with `source: frontmatter:stats.revenue`.

Supported frontmatter shapes:

- **Object map** — keys become categories, values become numbers. No `x`/`y`/`label`/`value` fields needed.
- **Array of objects** — requires `x`/`y` or `label`/`value` to name the fields in each object.

## Chart types

### Bar

Works with `x` + `y` or `label` + `value`:

```yaml
type: bar
source: table:sales
x: month
y: revenue
```

### Line

Requires `x` + `y` for table and array sources. Object-map frontmatter sources use keys/values directly:

```yaml
type: line
source: frontmatter:stats.revenue
title: Revenue trend
```

### Pie

Requires `label` + `value` for table and array sources. Object-map frontmatter sources use keys/values directly:

```yaml
type: pie
source: frontmatter:stats.time_spent
title: Time breakdown
```

## Sizing

Charts use default dimensions that work well in most editor widths. Override them with `width` and `height`:

```yaml
type: bar
source: table:sales
x: month
y: revenue
width: 500
height: 250
```

Values are in SVG viewBox units (roughly equivalent to pixels at 1x scale). The chart scales proportionally within the editor width.

| Chart type | Default width | Default height |
| ---------- | ------------- | -------------- |
| Bar        | 300           | 180            |
| Line       | 300           | 180            |
| Pie        | 240           | 180            |

## Error handling

If a chart block has invalid config or can't resolve its data source, Writer shows an inline error message at that location. The raw markdown is never modified. Common errors:

- `Chart source "X" was not found` — the table label or frontmatter path doesn't exist
- `Field "X" contains non-numeric values` — a value column has text instead of numbers
- `Pie charts require label and value fields` — wrong field names for the chart type
- `Unknown chart type "X"` — only `bar`, `line`, and `pie` are supported

## Editing behavior

- **Cursor outside the block**: the chart replaces the fenced block
- **Cursor inside the block**: raw config is visible with a chart preview below
- **Data changes**: editing the source table or frontmatter updates the chart immediately
- **Source of truth**: the raw markdown is always the source of truth; charts are a rendered view
