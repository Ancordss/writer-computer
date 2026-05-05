import { parse } from "yaml";
import { chartError, type ChartSpecError } from "./chart-errors";

export type ChartType = "bar" | "line" | "pie";

export type ChartSourceRef = { kind: "table"; id: string } | { kind: "frontmatter"; path: string };

export interface ParsedChartConfig {
  type: ChartType;
  source: ChartSourceRef;
  title?: string;
  x?: string;
  y?: string;
  label?: string;
  value?: string;
  width?: number;
  height?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseSource(value: unknown): ChartSourceRef | ChartSpecError {
  if (typeof value !== "string") {
    return chartError("invalid-config", "Chart source must be a string");
  }

  if (value.startsWith("table:")) {
    const id = value.slice("table:".length).trim();
    return id ? { kind: "table", id } : chartError("invalid-config", "Table source id is required");
  }

  if (value.startsWith("frontmatter:")) {
    const path = value.slice("frontmatter:".length).trim();
    return path
      ? { kind: "frontmatter", path }
      : chartError("invalid-config", "Frontmatter source path is required");
  }

  return chartError("invalid-config", `Unsupported chart source "${value}"`);
}

function readOptionalString(
  config: Record<string, unknown>,
  key: string,
): string | undefined | ChartSpecError {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    return chartError("invalid-config", `Chart field "${key}" must be a string`);
  }
  return value;
}

function readOptionalNumber(
  config: Record<string, unknown>,
  key: string,
): number | undefined | ChartSpecError {
  const v = config[key];
  if (v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return chartError("invalid-config", `Chart field "${key}" must be a positive number`);
}

function hasPair(left?: string, right?: string) {
  return Boolean(left && right);
}

export function parseChartBlock(raw: string): ParsedChartConfig | ChartSpecError {
  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch {
    return chartError("invalid-config", "Chart config is not valid YAML");
  }

  if (!isRecord(parsed)) {
    return chartError("invalid-config", "Chart config must be a YAML object");
  }

  if (typeof parsed.type !== "string") {
    return chartError("invalid-config", "Chart type is required");
  }

  if (!(["bar", "line", "pie"] as const).includes(parsed.type as ChartType)) {
    return chartError("invalid-config", `Unknown chart type "${String(parsed.type)}"`);
  }

  const source = parseSource(parsed.source);
  if ("code" in source) return source;

  const title = readOptionalString(parsed, "title");
  if (title && typeof title !== "string") return title;
  const x = readOptionalString(parsed, "x");
  if (x && typeof x !== "string") return x;
  const y = readOptionalString(parsed, "y");
  if (y && typeof y !== "string") return y;
  const label = readOptionalString(parsed, "label");
  if (label && typeof label !== "string") return label;
  const value = readOptionalString(parsed, "value");
  if (value && typeof value !== "string") return value;

  const width = readOptionalNumber(parsed, "width");
  if (width && typeof width !== "number") return width;
  const height = readOptionalNumber(parsed, "height");
  if (height && typeof height !== "number") return height;

  const xy = hasPair(x, y);
  const lv = hasPair(label, value);
  const type = parsed.type as ChartType;

  if (type === "bar" && xy && lv) {
    return chartError("invalid-config", "Bar charts must use either x/y or label/value, not both");
  }
  if (type === "line" && lv) {
    return chartError("invalid-config", "Line charts require x and y fields");
  }
  if (type === "pie" && (x !== undefined || y !== undefined)) {
    return chartError("invalid-config", "Pie charts require label and value fields");
  }

  return {
    type,
    source,
    title: title || undefined,
    x: x || undefined,
    y: y || undefined,
    label: label || undefined,
    value: value || undefined,
    width: width || undefined,
    height: height || undefined,
  };
}
