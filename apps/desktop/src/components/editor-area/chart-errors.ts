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
