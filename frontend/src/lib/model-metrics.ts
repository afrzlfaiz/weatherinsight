// ============================================================================
// Model Metrics — dari backend /api/model-metrics, fallback ke data hardcoded.
// ponytail: hardcoded array disimpan sebagai fallback offline / backend down.
// ============================================================================

import { fetchModelMetrics as fetchBackendMetrics } from "./api";
import type { ModelMetric } from "./api";

export type { ModelMetric };

// ─── Hardcoded fallback (dari model_metrics.csv, 2026-07-15) ───────────────

const FALLBACK_METRICS: ModelMetric[] = [
  { city: "Ambon", province: "Maluku", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.861, rmse: 1.084, mape: 3.34, maeBaseline: 0.623, rmseBaseline: 0.834, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Banda Aceh", province: "Aceh", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.354, rmse: 1.781, mape: 4.92, maeBaseline: 1.249, rmseBaseline: 1.607, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Bandar Lampung", province: "Lampung", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.542, rmse: 0.749, mape: 2.02, maeBaseline: 0.646, rmseBaseline: 0.872, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Bandung", province: "Jawa Barat", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.488, rmse: 1.719, mape: 6.29, maeBaseline: 0.869, rmseBaseline: 1.206, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Banjarbaru", province: "Kalimantan Selatan", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.721, rmse: 0.976, mape: 2.67, maeBaseline: 0.645, rmseBaseline: 0.902, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Bengkulu", province: "Bengkulu", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.882, rmse: 1.211, mape: 3.31, maeBaseline: 0.941, rmseBaseline: 1.241, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Denpasar", province: "Bali", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.863, rmse: 1.221, mape: 3.68, maeBaseline: 0.545, rmseBaseline: 0.722, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Gorontalo", province: "Gorontalo", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.925, rmse: 1.067, mape: 3.14, maeBaseline: 0.492, rmseBaseline: 0.644, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Jakarta", province: "DKI Jakarta", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.723, rmse: 0.916, mape: 2.49, maeBaseline: 0.7, rmseBaseline: 0.989, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Jambi", province: "Jambi", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.579, rmse: 0.803, mape: 2.11, maeBaseline: 0.802, rmseBaseline: 1.101, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Jayapura", province: "Papua", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.674, rmse: 0.89, mape: 2.53, maeBaseline: 0.69, rmseBaseline: 0.935, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Kendari", province: "Sulawesi Tenggara", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.697, rmse: 0.852, mape: 2.72, maeBaseline: 0.515, rmseBaseline: 0.693, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Kupang", province: "Nusa Tenggara Timur", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.639, rmse: 0.801, mape: 2.45, maeBaseline: 0.406, rmseBaseline: 0.54, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Makassar", province: "Sulawesi Selatan", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.705, rmse: 0.875, mape: 2.48, maeBaseline: 0.461, rmseBaseline: 0.606, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Mamuju", province: "Sulawesi Barat", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.645, rmse: 0.799, mape: 2.29, maeBaseline: 0.526, rmseBaseline: 0.671, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Manado", province: "Sulawesi Utara", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.837, rmse: 2.253, mape: 6.07, maeBaseline: 0.833, rmseBaseline: 1.356, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Manokwari", province: "Papua Barat", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.866, rmse: 1.096, mape: 3.35, maeBaseline: 0.765, rmseBaseline: 1.064, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Mataram", province: "Nusa Tenggara Barat", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.15, rmse: 1.562, mape: 4.87, maeBaseline: 0.825, rmseBaseline: 1.05, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Medan", province: "Sumatera Utara", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.893, rmse: 1.213, mape: 3.22, maeBaseline: 1.285, rmseBaseline: 1.705, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Merauke", province: "Papua Selatan", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.564, rmse: 0.71, mape: 2.19, maeBaseline: 0.664, rmseBaseline: 0.873, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Nabire", province: "Papua Tengah", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.766, rmse: 0.999, mape: 2.96, maeBaseline: 0.71, rmseBaseline: 0.974, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Padang", province: "Sumatera Barat", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.806, rmse: 1.061, mape: 3.06, maeBaseline: 0.95, rmseBaseline: 1.325, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Palangka Raya", province: "Kalimantan Tengah", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.826, rmse: 1.03, mape: 3.01, maeBaseline: 0.924, rmseBaseline: 1.356, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Palembang", province: "Sumatera Selatan", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.947, rmse: 1.174, mape: 3.19, maeBaseline: 0.67, rmseBaseline: 1.075, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Palu", province: "Sulawesi Tengah", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.015, rmse: 1.308, mape: 3.43, maeBaseline: 0.841, rmseBaseline: 1.163, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Pangkal Pinang", province: "Kepulauan Bangka Belitung", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.672, rmse: 0.907, mape: 2.31, maeBaseline: 0.841, rmseBaseline: 1.209, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Pekanbaru", province: "Riau", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.878, rmse: 1.275, mape: 3.25, maeBaseline: 0.986, rmseBaseline: 1.425, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Pontianak", province: "Kalimantan Barat", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.844, rmse: 1.148, mape: 3.05, maeBaseline: 1.043, rmseBaseline: 1.534, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Samarinda", province: "Kalimantan Timur", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.872, rmse: 1.084, mape: 3.15, maeBaseline: 0.889, rmseBaseline: 1.225, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Semarang", province: "Jawa Tengah", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.147, rmse: 1.433, mape: 4.26, maeBaseline: 0.591, rmseBaseline: 0.751, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Serang", province: "Banten", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.79, rmse: 1.098, mape: 2.74, maeBaseline: 0.85, rmseBaseline: 1.197, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Sofifi", province: "Maluku Utara", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.798, rmse: 0.988, mape: 2.84, maeBaseline: 0.508, rmseBaseline: 0.683, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Sorong", province: "Papua Barat Daya", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.64, rmse: 0.817, mape: 2.43, maeBaseline: 0.764, rmseBaseline: 1.025, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Surabaya", province: "Jawa Timur", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.852, rmse: 1.209, mape: 3.18, maeBaseline: 0.66, rmseBaseline: 0.903, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Tanjung Pinang", province: "Kepulauan Riau", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.646, rmse: 0.83, mape: 2.27, maeBaseline: 0.899, rmseBaseline: 1.196, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Tanjung Selor", province: "Kalimantan Utara", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 0.804, rmse: 1.107, mape: 3.04, maeBaseline: 0.97, rmseBaseline: 1.336, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Wamena", province: "Papua Pegunungan", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.061, rmse: 1.396, mape: 6.24, maeBaseline: 1.108, rmseBaseline: 1.513, betterThanBaseline: true, modelVersion: "v1", updatedAt: "2026-07-15" },
  { city: "Yogyakarta", province: "DI Yogyakarta", target: "temperature_2m", nTrain: 8448, nTest: 336, mae: 1.093, rmse: 1.376, mape: 4.46, maeBaseline: 0.785, rmseBaseline: 1.046, betterThanBaseline: false, modelVersion: "v1", updatedAt: "2026-07-15" },
];

// ─── Runtime cache ──────────────────────────────────────────────────────────

let _cachedMetrics: ModelMetric[] | null = null;

async function getMetrics(): Promise<ModelMetric[]> {
  if (_cachedMetrics) return _cachedMetrics;
  const fromBackend = await fetchBackendMetrics();
  _cachedMetrics = fromBackend.length > 0 ? fromBackend : FALLBACK_METRICS;
  return _cachedMetrics;
}

// ─── Public API (backward-compatible dengan pemanggil lama) ──────────────────

export let MODEL_METRICS: ModelMetric[] = FALLBACK_METRICS;

/** Panggil sekali saat app init — isi MODEL_METRICS dari backend. */
export async function loadModelMetrics(): Promise<void> {
  MODEL_METRICS = await getMetrics();
}

export function getMetricsByCity(city: string): ModelMetric | undefined {
  return MODEL_METRICS.find((m) => m.city === city);
}

export function getModelSummary() {
  const total = MODEL_METRICS.length;
  const better = MODEL_METRICS.filter((m) => m.betterThanBaseline).length;
  const avgMae = MODEL_METRICS.reduce((s, m) => s + m.mae, 0) / total;
  const avgMape = MODEL_METRICS.reduce((s, m) => s + (m.mape ?? 0), 0) / total;
  const bestCity = MODEL_METRICS.reduce((a, b) => (a.mae < b.mae ? a : b));
  const worstCity = MODEL_METRICS.reduce((a, b) => (a.mae > b.mae ? a : b));
  return { total, better, avgMae, avgMape, bestCity, worstCity };
}
