export interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
}

function parseCells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const stripped = inner.endsWith("|") ? inner.slice(0, -1) : inner;
  return stripped.split("|").map((cell) => cell.trim());
}

export function parseMarkdownTable(text: string): ParsedMarkdownTable | null {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return null;

  const headers = parseCells(lines[0]);
  const delimiter = parseCells(lines[1]);
  if (!delimiter.every((cell) => /^:?-+:?$/.test(cell))) return null;

  return {
    headers,
    rows: lines.slice(2).map(parseCells),
  };
}
