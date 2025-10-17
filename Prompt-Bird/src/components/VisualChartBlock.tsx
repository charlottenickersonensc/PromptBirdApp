import { useMemo } from 'react';
import type { JSX } from 'react';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from './ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#22c55e', '#f97316', '#0ea5e9'];

type ChartSeries = {
  key: string;
  name?: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
};

type ParsedChart = {
  type: 'line' | 'bar' | 'area' | 'pie';
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: ChartSeries[];
  options?: {
    stacked?: boolean;
    dot?: boolean;
    tension?: number;
  };
  error?: string;
};

const DEFAULT_PARSED: ParsedChart = {
  type: 'line',
  data: [],
  xKey: 'label',
  series: [{ key: 'value', name: 'Value' }]
};

const normalizeSeries = (series: ChartSeries[], data: Array<Record<string, unknown>>) => {
  if (series.length) {
    return series;
  }

  if (!data.length) {
    return DEFAULT_PARSED.series;
  }

  const keys = Object.keys(data[0] ?? {}).filter((key) => key !== 'label' && key !== 'name');
  if (!keys.length) {
    return DEFAULT_PARSED.series;
  }

  return keys.map((key) => ({ key, name: key }));
};

const parseChartSpec = (code: string): ParsedChart => {
  if (!code.trim()) {
    return DEFAULT_PARSED;
  }

  try {
    const parsed = JSON.parse(code);
    const typeValue = typeof parsed.type === 'string' ? parsed.type.toLowerCase() : 'line';
    const normalizedType: ParsedChart['type'] =
      typeValue === 'bar'
        ? 'bar'
        : typeValue === 'area'
          ? 'area'
          : typeValue === 'pie'
            ? 'pie'
            : 'line';

    const data = Array.isArray(parsed.data) ? parsed.data : [];
    const xKey = typeof parsed.xKey === 'string' ? parsed.xKey : 'label';
    const rawSeries = Array.isArray(parsed.series) ? parsed.series : [];
    const series = normalizeSeries(
      rawSeries.filter((entry: unknown): entry is ChartSeries =>
        !!entry && typeof entry === 'object' && 'key' in entry && typeof (entry as ChartSeries).key === 'string'
      ),
      data
    );

    const options = typeof parsed.options === 'object' ? parsed.options : undefined;

    return {
      type: normalizedType,
      data,
      xKey,
      series,
      options
    };
  } catch (error) {
    return {
      ...DEFAULT_PARSED,
      error: error instanceof Error ? error.message : 'Failed to parse chart specification'
    };
  }
};

interface VisualChartBlockProps {
  code: string;
}

export function VisualChartBlock({ code }: VisualChartBlockProps) {
  const parsed = useMemo(() => parseChartSpec(code), [code]);

  const chartConfig = useMemo(() => {
    const entries = parsed.series.map((series, index) => [
      series.key,
      {
        label: series.name ?? series.key,
        color: series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      }
    ]);

    return Object.fromEntries(entries);
  }, [parsed.series]);

  if (parsed.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Chart configuration error</AlertTitle>
        <AlertDescription>{parsed.error}</AlertDescription>
      </Alert>
    );
  }

  if (!parsed.data.length) {
    return (
      <Alert>
        <AlertTitle>No data to display</AlertTitle>
        <AlertDescription>
          Provide a JSON configuration with a <code>data</code> array to render the chart.
        </AlertDescription>
      </Alert>
    );
  }

  const { type, data, xKey, series, options } = parsed;

  let chartElement: JSX.Element;

  switch (type) {
    case 'bar':
      chartElement = (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xKey} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.name}
              fill={entry.color ?? chartConfig[entry.key]?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              stackId={options?.stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      );
      break;
    case 'area':
      chartElement = (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xKey} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((entry, index) => (
            <Area
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.name}
              fill={entry.color ?? chartConfig[entry.key]?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              stroke={entry.color ?? chartConfig[entry.key]?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              stackId={options?.stacked ? 'stack' : undefined}
              fillOpacity={0.35}
            />
          ))}
        </AreaChart>
      );
      break;
    case 'pie':
      chartElement = (
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Pie
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey={series[0]?.key ?? 'value'}
            nameKey={xKey}
            data={data}
            label
          >
            {data.map((entry, index) => (
              <Cell
                key={`${String(entry[xKey])}-${index}`}
                fill={
                  series[index]?.color ??
                  series[0]?.color ??
                  DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                }
              />
            ))}
          </Pie>
        </PieChart>
      );
      break;
    case 'line':
    default:
      chartElement = (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xKey} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((entry, index) => (
            <Line
              key={entry.key}
              type={options?.tension ? 'monotone' : 'linear'}
              dataKey={entry.key}
              name={entry.name}
              stroke={entry.color ?? chartConfig[entry.key]?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              strokeWidth={2}
              dot={options?.dot ?? false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      );
      break;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      {chartElement}
    </ChartContainer>
  );
}
