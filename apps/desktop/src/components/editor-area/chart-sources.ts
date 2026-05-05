import { parse } from "yaml";
import { parseFrontmatter } from "@/lib/frontmatter";
import { chartError, type ChartSpecError } from "./chart-errors";
import { parseMarkdownTable, type ParsedMarkdownTable } from "./chart-markdown-table";
import type { ChartSourceRef } from "./chart-parser";

export type ResolvedChartSource =
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "frontmatter"; value: unknown };

function resolveFrontmatterPath(frontmatter: string | null, path: string): unknown {
  if (path.split(".").some((segment) => /^\d+$/.test(segment))) {
    throw chartError("missing-source", `Frontmatter path "${path}" was not found`);
  }

  if (frontmatter === null || frontmatter.trim() === "") {
    throw chartError("missing-source", `Frontmatter path "${path}" was not found`);
  }

  try {
    let current: unknown = parse(frontmatter);
    for (const segment of path.split(".")) {
      if (current === null || typeof current !== "object" || Array.isArray(current)) {
        throw chartError("missing-source", `Frontmatter path "${path}" was not found`);
      }
      current = (current as Record<string, unknown>)[segment];
      if (current === undefined) {
        throw chartError("missing-source", `Frontmatter path "${path}" was not found`);
      }
    }

    return current;
  } catch {
    throw chartError("missing-source", `Frontmatter path "${path}" was not found`);
  }
}

function resolveTableSource(note: string, id: string): ResolvedChartSource | ChartSpecError {
  const lines = note.split("\n");
  const matches: ParsedMarkdownTable[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.match(/^<!--\s*chart-source:\s*([^>]+?)\s*-->$/);
    if (!match) continue;
    if (match[1]?.trim() !== id) continue;

    // Find the next non-empty line after the comment. Skip blank lines
    // so formatters that insert whitespace between the comment and the
    // table don't break the association.
    let tableStart = index + 1;
    while (tableStart < lines.length && (lines[tableStart] ?? "").trim() === "") {
      tableStart += 1;
    }
    if (!(lines[tableStart] ?? "").trim().startsWith("|")) continue;

    const tableLines: string[] = [];
    for (let cursor = tableStart; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] ?? "";
      if (!line.trim()) break;
      if (!line.trim().startsWith("|")) break;
      tableLines.push(line);
    }

    const parsed = parseMarkdownTable(tableLines.join("\n"));
    if (parsed) matches.push(parsed);
  }

  if (matches.length > 1) {
    return chartError("duplicate-source", `Chart source "${id}" is defined more than once`);
  }

  const table = matches[0];
  if (!table) {
    return chartError("missing-source", `Chart source "${id}" was not found`);
  }

  return { kind: "table", headers: table.headers, rows: table.rows };
}

export function resolveChartSource(
  note: string,
  source: ChartSourceRef,
): ResolvedChartSource | ChartSpecError {
  if (source.kind === "table") {
    return resolveTableSource(note, source.id);
  }

  const { frontmatter } = parseFrontmatter(note);
  try {
    return { kind: "frontmatter", value: resolveFrontmatterPath(frontmatter, source.path) };
  } catch (error) {
    return error as ChartSpecError;
  }
}
