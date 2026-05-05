import type { ParsedChartConfig } from "./chart-parser";
import type { NormalizedChartData } from "./chart-normalize";
import type { ChartSpecError } from "./chart-errors";

interface ChartWidgetProps {
  config: ParsedChartConfig;
  data: NormalizedChartData;
}

function chartName(config: ParsedChartConfig) {
  return config.title ?? `${config.type} chart preview`;
}

// ---------------------------------------------------------------------------
// Bar chart
// ---------------------------------------------------------------------------

const BAR_W = 300;
const BAR_H = 180;
const BAR_PAD_LEFT = 40;
const BAR_PAD_BOTTOM = 28;
const BAR_PAD_TOP = 12;

function BarChart({
  rows,
  width: w,
  height: h,
}: {
  rows: Array<{ x: string; y: number }>;
  width?: number;
  height?: number;
}) {
  const W = w ?? BAR_W;
  const H = h ?? BAR_H;
  const maxY = Math.max(...rows.map((r) => r.y), 1);
  const plotW = W - BAR_PAD_LEFT;
  const plotH = H - BAR_PAD_BOTTOM - BAR_PAD_TOP;
  const barW = plotW / rows.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cm-chart-svg">
      {/* Y-axis labels */}
      <text x={BAR_PAD_LEFT - 4} y={BAR_PAD_TOP + 4} className="cm-chart-label" textAnchor="end">
        {maxY}
      </text>
      <text
        x={BAR_PAD_LEFT - 4}
        y={H - BAR_PAD_BOTTOM + 4}
        className="cm-chart-label"
        textAnchor="end"
      >
        0
      </text>

      {/* Bars + X labels + value labels */}
      {rows.map((row, i) => {
        const bh = (row.y / maxY) * plotH;
        const x = BAR_PAD_LEFT + i * barW;
        const y = BAR_PAD_TOP + plotH - bh;
        return (
          <g key={`${row.x}-${i}`}>
            <rect
              x={x + barW * 0.15}
              y={y}
              width={barW * 0.7}
              height={bh}
              rx="2"
              className="cm-chart-bar"
            />
            <text x={x + barW / 2} y={y - 3} className="cm-chart-value-label" textAnchor="middle">
              {row.y}
            </text>
            <text
              x={x + barW / 2}
              y={H - BAR_PAD_BOTTOM + 14}
              className="cm-chart-label"
              textAnchor="middle"
            >
              {row.x}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={BAR_PAD_LEFT}
        y1={H - BAR_PAD_BOTTOM}
        x2={W}
        y2={H - BAR_PAD_BOTTOM}
        className="cm-chart-axis"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Line chart
// ---------------------------------------------------------------------------

const LINE_W = 300;
const LINE_H = 180;
const LINE_PAD_LEFT = 40;
const LINE_PAD_RIGHT = 12;
const LINE_PAD_BOTTOM = 28;
const LINE_PAD_TOP = 12;

function LineChart({
  rows,
  width: w,
  height: h,
}: {
  rows: Array<{ x: string; y: number }>;
  width?: number;
  height?: number;
}) {
  const W = w ?? LINE_W;
  const H = h ?? LINE_H;
  const maxY = Math.max(...rows.map((r) => r.y), 1);
  const plotW = W - LINE_PAD_LEFT - LINE_PAD_RIGHT;
  const plotH = H - LINE_PAD_BOTTOM - LINE_PAD_TOP;
  const step = rows.length === 1 ? 0 : plotW / (rows.length - 1);

  function px(i: number) {
    return LINE_PAD_LEFT + i * step;
  }
  function py(v: number) {
    return LINE_PAD_TOP + plotH - (v / maxY) * plotH;
  }

  const points = rows.map((r, i) => `${px(i)},${py(r.y)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cm-chart-svg">
      {/* Y-axis labels */}
      <text x={LINE_PAD_LEFT - 4} y={LINE_PAD_TOP + 4} className="cm-chart-label" textAnchor="end">
        {maxY}
      </text>
      <text
        x={LINE_PAD_LEFT - 4}
        y={H - LINE_PAD_BOTTOM + 4}
        className="cm-chart-label"
        textAnchor="end"
      >
        0
      </text>

      {/* Line */}
      <polyline points={points} fill="none" className="cm-chart-line" />

      {/* Points + labels */}
      {rows.map((row, i) => (
        <g key={`${row.x}-${i}`}>
          <circle cx={px(i)} cy={py(row.y)} r="3" className="cm-chart-point" />
          <text x={px(i)} y={py(row.y) - 6} className="cm-chart-value-label" textAnchor="middle">
            {row.y}
          </text>
          <text
            x={px(i)}
            y={H - LINE_PAD_BOTTOM + 14}
            className="cm-chart-label"
            textAnchor="middle"
          >
            {row.x}
          </text>
        </g>
      ))}

      {/* Baseline */}
      <line
        x1={LINE_PAD_LEFT}
        y1={H - LINE_PAD_BOTTOM}
        x2={W}
        y2={H - LINE_PAD_BOTTOM}
        className="cm-chart-axis"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pie chart
// ---------------------------------------------------------------------------

const PIE_SIZE = 240;

function PieChart({
  rows,
  width: w,
  height: h,
}: {
  rows: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
}) {
  const W = w ?? PIE_SIZE;
  const H = h ?? PIE_SIZE * 0.75;
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const r = Math.min(W * 0.35, H * 0.45);
  const cx = r + 20;
  const cy = H / 2;
  const legendX = cx + r + 25;
  let current = 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cm-chart-svg">
      {rows.map((row, index) => {
        const start = (current / total) * Math.PI * 2;
        current += row.value;
        const end = (current / total) * Math.PI * 2;
        const x1 = cx + r * Math.cos(start - Math.PI / 2);
        const y1 = cy + r * Math.sin(start - Math.PI / 2);
        const x2 = cx + r * Math.cos(end - Math.PI / 2);
        const y2 = cy + r * Math.sin(end - Math.PI / 2);
        const largeArc = end - start > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        const pct = Math.round((row.value / total) * 100);
        return (
          <g key={`${row.label}-${index}`}>
            <path d={d} className={`cm-chart-slice cm-chart-slice-${index % 5}`} />
            {/* Legend entry */}
            <rect
              x={legendX}
              y={10 + index * 18}
              width={10}
              height={10}
              rx="2"
              className={`cm-chart-slice cm-chart-slice-${index % 5}`}
            />
            <text x={legendX + 14} y={10 + index * 18 + 9} className="cm-chart-label">
              {row.label} ({pct}%)
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function chartSummary(config: ParsedChartConfig, data: NormalizedChartData) {
  const values =
    data.kind === "xy"
      ? data.rows.map((row) => row.y).join(",")
      : data.rows.map((row) => row.value).join(",");
  return `type=${config.type};points=${data.rows.length};values=${values}`;
}

export function ChartWidget({ config, data }: ChartWidgetProps) {
  const label = chartName(config);
  const summary = chartSummary(config, data);
  return (
    <div className="cm-chart-widget" data-chart-summary={summary}>
      <div className="cm-chart-header">{config.title ?? `${config.type} chart`}</div>
      <div role="img" aria-label={label}>
        {data.kind === "xy" ? (
          config.type === "line" ? (
            <LineChart rows={data.rows} width={config.width} height={config.height} />
          ) : (
            <BarChart rows={data.rows} width={config.width} height={config.height} />
          )
        ) : (
          <PieChart rows={data.rows} width={config.width} height={config.height} />
        )}
      </div>
    </div>
  );
}

export function ChartErrorWidget({ error }: { error: ChartSpecError }) {
  return <div className="cm-chart-error">Chart error: {error.message}</div>;
}
