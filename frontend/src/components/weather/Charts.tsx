"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale
);

// ─── Temperature Line Chart ────────────────────────────────────────────────

interface TemperatureChartProps {
  labels: string[];
  temperatures: number[];
  title?: string;
  height?: number;
  showArea?: boolean;
}

export function TemperatureChart({
  labels,
  temperatures,
  title = "Suhu",
  height = 300,
  showArea = true,
}: TemperatureChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: temperatures,
        borderColor: "#3b82f6",
        backgroundColor: showArea
          ? "rgba(59, 130, 246, 0.1)"
          : "transparent",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#3b82f6",
        pointHoverBorderColor: "#fff",
        tension: 0.4,
        fill: showArea,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `${(ctx.parsed.y ?? 0).toFixed(1)}°C`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value: string | number) => `${value}°`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div style={{ height, position: "relative", width: "100%", minWidth: 0 }}>
      <Line data={data} options={options as any} />
    </div>
  );
}

// ─── Multi-Line Comparison Chart ────────────────────────────────────────────

interface ComparisonChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
  height?: number;
  yLabel?: string;
}

export function ComparisonChart({
  labels,
  datasets,
  height = 350,
  yLabel = "°C",
}: ComparisonChartProps) {
  const data = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: `${ds.color}15`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: false,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#94a3b8",
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: { color: "#64748b", font: { size: 11 }, maxTicksLimit: 10 },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value: string | number) => `${value}${yLabel}`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div style={{ height, position: "relative", width: "100%", minWidth: 0 }}>
      <Line data={data} options={options as any} />
    </div>
  );
}

// ─── Bar Chart (for precipitation, etc.) ────────────────────────────────────

interface BarChartProps {
  labels: string[];
  values: number[];
  title?: string;
  color?: string;
  height?: number;
  yLabel?: string;
}

export function PrecipitationChart({
  labels,
  values,
  title = "Curah Hujan",
  color = "#06b6d4",
  height = 250,
  yLabel = " mm",
}: BarChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        backgroundColor: `${color}40`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `${(ctx.parsed.y ?? 0).toFixed(1)}${yLabel}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value: string | number) => `${value}${yLabel}`,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height, position: "relative", width: "100%", minWidth: 0 }}>
      <Bar data={data} options={options as any} />
    </div>
  );
}

// ─── Metrics Bar Chart (horizontal) ────────────────────────────────────────

interface MetricsBarChartProps {
  labels: string[];
  modelValues: number[];
  baselineValues: number[];
  height?: number;
}

export function MetricsBarChart({
  labels,
  modelValues,
  baselineValues,
  height = 400,
}: MetricsBarChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: "Prophet MAE",
        data: modelValues,
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "#3b82f6",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Baseline Naif MAE",
        data: baselineValues,
        backgroundColor: "rgba(148, 163, 184, 0.3)",
        borderColor: "#64748b",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#94a3b8",
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148, 163, 184, 0.06)" },
        ticks: { color: "#64748b", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 } },
        border: { display: false },
      },
    },
  };

  return (
    <div style={{ height, position: "relative", width: "100%", minWidth: 0 }}>
      <Bar data={data} options={options as any} />
    </div>
  );
}
