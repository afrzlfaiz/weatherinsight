"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  Brain,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { MetricsBarChart, PrecipitationChart } from "@/components/weather/Charts";
import { MODEL_METRICS, getModelSummary, loadModelMetrics } from "@/lib/model-metrics";

export default function AnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"mae" | "mape" | "city">("mae");
  const [filterBaseline, setFilterBaseline] = useState<"all" | "better" | "worse">("all");

  // ponytail: fetch metrics dari backend, fallback ke hardcoded
  useEffect(() => {
    loadModelMetrics().finally(() => setLoading(false));
  }, []);
  const summary = getModelSummary();

  const sortedMetrics = useMemo(() => {
    let filtered = [...MODEL_METRICS];

    if (filterBaseline === "better") {
      filtered = filtered.filter((m) => m.betterThanBaseline);
    } else if (filterBaseline === "worse") {
      filtered = filtered.filter((m) => !m.betterThanBaseline);
    }

    switch (sortBy) {
      case "mae":
        filtered.sort((a, b) => a.mae - b.mae);
        break;
      case "mape":
        filtered.sort((a, b) => (a.mape ?? 99) - (b.mape ?? 99));
        break;
      case "city":
        filtered.sort((a, b) => a.city.localeCompare(b.city));
        break;
    }

    return filtered;
  }, [sortBy, filterBaseline]);

  // Prepare bar chart data
  const barLabels = sortedMetrics.map((m) => m.city);
  const barModel = sortedMetrics.map((m) => m.mae);
  const barBaseline = sortedMetrics.map((m) => m.maeBaseline);

  // MAPE distribution
  const mapeLabels = MODEL_METRICS.sort((a, b) => (a.mape ?? 0) - (b.mape ?? 0)).map((m) => m.city);
  const mapeValues = MODEL_METRICS.sort((a, b) => (a.mape ?? 0) - (b.mape ?? 0)).map((m) => m.mape ?? 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}
        >
          <BarChart3 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Evaluasi model Prophet & statistik cuaca nasional
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {loading && <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: "var(--text-muted)" }}><Loader2 size={14} className="animate-spin" /> Memuat dari backend...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} style={{ color: "var(--accent-violet)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Total Model
            </span>
          </div>
          <p className="text-3xl font-extrabold" style={{ color: "var(--accent-violet)" }}>
            {summary.total}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            Prophet v1 · temperature_2m
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} style={{ color: "var(--accent-emerald)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Mengungguli Baseline
            </span>
          </div>
          <p className="text-3xl font-extrabold" style={{ color: "var(--accent-emerald)" }}>
            {summary.better}/{summary.total}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {((summary.better / summary.total) * 100).toFixed(0)}% kota
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown size={16} style={{ color: "var(--accent-blue)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Best Model
            </span>
          </div>
          <p className="text-2xl font-extrabold" style={{ color: "var(--accent-blue)" }}>
            {summary.bestCity.mae.toFixed(2)}°
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {summary.bestCity.city} (MAE)
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp size={16} style={{ color: "var(--accent-amber)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Rata-rata MAE
            </span>
          </div>
          <p className="text-2xl font-extrabold" style={{ color: "var(--accent-amber)" }}>
            {summary.avgMae.toFixed(2)}°
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            MAPE: {summary.avgMape.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Model vs Baseline Chart */}
      <div className="glass-card-static p-5 mb-6 min-w-0">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Brain size={18} style={{ color: "var(--accent-blue)" }} />
          MAE: Prophet vs Baseline Naif (per kota)
        </h2>
        <MetricsBarChart
          labels={barLabels}
          modelValues={barModel}
          baselineValues={barBaseline}
          height={Math.max(400, sortedMetrics.length * 28)}
        />
      </div>

      {/* MAPE Distribution */}
      <div className="glass-card-static p-5 mb-6 min-w-0">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <BarChart3 size={18} style={{ color: "var(--accent-cyan)" }} />
          Distribusi MAPE (%) per Kota
        </h2>
        <PrecipitationChart
          labels={mapeLabels}
          values={mapeValues}
          title="MAPE"
          color="#8b5cf6"
          height={300}
          yLabel="%"
        />
      </div>

      {/* Detailed Table */}
      <div className="glass-card-static p-5 min-w-0">
        <div className="flex-wrap-row justify-between mb-4">
          <h2 className="text-lg font-bold">Detail Metrik per Kota</h2>
          <div className="flex-wrap-row">
            <div className="tab-list">
              <button
                onClick={() => setFilterBaseline("all")}
                className={`tab-item ${filterBaseline === "all" ? "active" : ""}`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterBaseline("better")}
                className={`tab-item ${filterBaseline === "better" ? "active" : ""}`}
              >
                ✅ Better
              </button>
              <button
                onClick={() => setFilterBaseline("worse")}
                className={`tab-item ${filterBaseline === "worse" ? "active" : ""}`}
              >
                ⚠️ Worse
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "mae" | "mape" | "city")}
            >
              <option value="mae">Sort: MAE</option>
              <option value="mape">Sort: MAPE</option>
              <option value="city">Sort: Kota</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th className="text-left py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Kota</th>
                <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>MAE (°C)</th>
                <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>RMSE</th>
                <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>MAPE (%)</th>
                <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Baseline MAE</th>
                <th className="text-center py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>N Train</th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((m) => (
                <tr
                  key={m.city}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td className="py-3 px-3">
                    <span className="text-sm font-semibold">{m.city}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono font-bold" style={{ color: "var(--accent-blue)" }}>
                      {m.mae.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                      {m.rmse.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono" style={{ color: "var(--accent-amber)" }}>
                      {m.mape?.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                      {m.maeBaseline.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {m.betterThanBaseline ? (
                      <CheckCircle2 size={16} style={{ color: "var(--accent-emerald)" }} className="inline" />
                    ) : (
                      <XCircle size={16} style={{ color: "var(--accent-amber)" }} className="inline" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                      {m.nTrain.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] mt-4" style={{ color: "var(--text-muted)" }}>
          Baseline: seasonal naive harian (nilai 24 jam sebelumnya). Model: Prophet v1 dengan daily + weekly seasonality.
          Split kronologis, holdout 14 hari terakhir. Data training: {MODEL_METRICS[0]?.nTrain.toLocaleString()} baris/kota.
        </p>
      </div>
    </div>
  );
}
