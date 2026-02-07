"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Color palette for charts
const COLORS = [
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // purple
];

export type DemographicsChartType =
  | "byFamily"
  | "byCountry"
  | "peopleDistribution";

interface ChartDataItem {
  name: string;
  value: number;
  id?: string;
  percentage?: number;
}

interface DemographicsChartProps {
  type: DemographicsChartType;
  data: ChartDataItem[];
  title?: string;
  className?: string;
}

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
};

// Format percentage
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Tooltip payload type
interface TooltipPayloadItem {
  payload: ChartDataItem;
  value: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

// Custom tooltip for pie chart
const PieTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-semibold">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Population: {formatNumber(data.value)}
        </p>
        {data.percentage !== undefined && (
          <p className="text-sm text-muted-foreground">
            {formatPercentage(data.percentage)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Custom tooltip for bar chart
const BarTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">
          Population: {formatNumber(payload[0].value)}
        </p>
        {payload[0].payload.percentage !== undefined && (
          <p className="text-sm text-muted-foreground">
            {formatPercentage(payload[0].payload.percentage)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Pie chart component for "byFamily" type
const FamilyPieChart = ({
  data,
  title,
}: {
  data: ChartDataItem[];
  title?: string;
}) => {
  // Sort by value descending and take top 10
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length > 10) {
      const top10 = sorted.slice(0, 10);
      const others = sorted.slice(10);
      const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
      if (othersTotal > 0) {
        top10.push({ name: "Others", value: othersTotal });
      }
      return top10;
    }
    return sorted;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {title || "Distribution by Language Family"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="h-[300px]"
          role="img"
          aria-label={
            title ||
            "Pie chart showing population distribution by language family"
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sortedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {sortedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Bar chart component for "byCountry" type
const CountryBarChart = ({
  data,
  title,
}: {
  data: ChartDataItem[];
  title?: string;
}) => {
  // Sort by value descending and take top 15
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value).slice(0, 15);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {title || "Population by Country"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="h-[400px]"
          role="img"
          aria-label={title || "Bar chart showing population by country"}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={formatNumber}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                dataKey="name"
                type="category"
                width={70}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sortedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Bar chart component for "peopleDistribution" type
const PeopleDistributionChart = ({
  data,
  title,
}: {
  data: ChartDataItem[];
  title?: string;
}) => {
  // Sort by percentage/value descending
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.percentage !== undefined && b.percentage !== undefined) {
        return b.percentage - a.percentage;
      }
      return b.value - a.value;
    });
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {title || "Distribution Across Countries"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="h-[300px]"
          role="img"
          aria-label={
            title || "Bar chart showing people distribution across countries"
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={(value) =>
                  sortedData[0]?.percentage !== undefined
                    ? `${value}%`
                    : formatNumber(value)
                }
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<BarTooltip />} />
              <Bar
                dataKey={
                  sortedData[0]?.percentage !== undefined
                    ? "percentage"
                    : "value"
                }
                radius={[4, 4, 0, 0]}
                fill="#8b5cf6"
              >
                {sortedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const DemographicsChart = ({
  type,
  data,
  title,
  className,
}: DemographicsChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title || "Demographics"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  switch (type) {
    case "byFamily":
      return <FamilyPieChart data={data} title={title} />;
    case "byCountry":
      return <CountryBarChart data={data} title={title} />;
    case "peopleDistribution":
      return <PeopleDistributionChart data={data} title={title} />;
    default:
      return null;
  }
};

export default DemographicsChart;
