import { chartError, type ChartSpecError } from "./chart-errors";
import type { ParsedChartConfig } from "./chart-parser";
import type { ResolvedChartSource } from "./chart-sources";

export type NormalizedChartData =
  | { kind: "xy"; rows: Array<{ x: string; y: number }> }
  | { kind: "slice"; rows: Array<{ label: string; value: number }> };

function coerceNumber(value: unknown, fieldName: string): number | ChartSpecError {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return chartError("non-numeric", `Field "${fieldName}" contains non-numeric values`);
}

function coerceLabelValue(value: unknown, fieldName: string): string | ChartSpecError {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return chartError("invalid-shape", `Field "${fieldName}" does not contain label text`);
}

export function normalizeChartData(
  config: ParsedChartConfig,
  source: ResolvedChartSource,
): NormalizedChartData | ChartSpecError {
  if (source.kind === "table") {
    const categoryField = config.type === "pie" ? config.label : (config.x ?? config.label);
    const valueField = config.type === "pie" ? config.value : (config.y ?? config.value);
    if (!categoryField || !valueField) {
      return chartError("invalid-shape", `${config.type} chart is missing required field mappings`);
    }

    const categoryIndex = source.headers.indexOf(categoryField);
    const valueIndex = source.headers.indexOf(valueField);
    if (categoryIndex === -1 || valueIndex === -1) {
      return chartError(
        "missing-field",
        `Column "${categoryIndex === -1 ? categoryField : valueField}" was not found`,
      );
    }

    const normalized = source.rows.map((row) => {
      const numeric = coerceNumber(row[valueIndex] ?? "", valueField);
      if (typeof numeric !== "number") return numeric;
      return config.type === "pie"
        ? { label: row[categoryIndex] ?? "", value: numeric }
        : { x: row[categoryIndex] ?? "", y: numeric };
    });

    const error = normalized.find((row) => "code" in row);
    if (error) return error as ChartSpecError;
    return config.type === "pie"
      ? { kind: "slice", rows: normalized as Array<{ label: string; value: number }> }
      : { kind: "xy", rows: normalized as Array<{ x: string; y: number }> };
  }

  const value = source.value;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return chartError("empty-dataset", "Frontmatter source resolved to an empty dataset");
    }
    const categoryField = config.type === "pie" ? config.label : (config.x ?? config.label);
    const valueField = config.type === "pie" ? config.value : (config.y ?? config.value);
    if (!categoryField || !valueField) {
      return chartError(
        "invalid-shape",
        `${config.type} chart requires field selectors for frontmatter arrays`,
      );
    }

    const normalized = value.map((entry) => {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        return chartError("invalid-shape", "Frontmatter path does not resolve to chartable data");
      }
      const record = entry as Record<string, unknown>;
      if (!(categoryField in record) || !(valueField in record)) {
        return chartError(
          "missing-field",
          `Field "${!(categoryField in record) ? categoryField : valueField}" was not found`,
        );
      }
      const numeric = coerceNumber(record[valueField], valueField);
      if (typeof numeric !== "number") return numeric;
      const label = coerceLabelValue(record[categoryField], categoryField);
      if (typeof label !== "string") return label;
      return config.type === "pie" ? { label, value: numeric } : { x: label, y: numeric };
    });

    const error = normalized.find((row) => "code" in row);
    if (error) return error as ChartSpecError;
    return config.type === "pie"
      ? { kind: "slice", rows: normalized as Array<{ label: string; value: number }> }
      : { kind: "xy", rows: normalized as Array<{ x: string; y: number }> };
  }

  if (value === null || typeof value !== "object") {
    return chartError(
      "invalid-shape",
      `Frontmatter path "${config.source.kind === "frontmatter" ? config.source.path : ""}" does not resolve to chartable data`,
    );
  }

  if (config.x || config.y || config.label || config.value) {
    return chartError(
      "invalid-shape",
      "Frontmatter object-map sources must not declare field selectors",
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return chartError("empty-dataset", "Frontmatter source resolved to an empty dataset");
  }

  const normalized = entries.map(([key, entryValue]) => {
    const numeric = coerceNumber(entryValue, key);
    if (typeof numeric !== "number") return numeric;
    return config.type === "pie" ? { label: key, value: numeric } : { x: key, y: numeric };
  });

  const error = normalized.find((row) => "code" in row);
  if (error) return error as ChartSpecError;
  return config.type === "pie"
    ? { kind: "slice", rows: normalized as Array<{ label: string; value: number }> }
    : { kind: "xy", rows: normalized as Array<{ x: string; y: number }> };
}
