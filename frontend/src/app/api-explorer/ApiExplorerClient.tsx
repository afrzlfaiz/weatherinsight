"use client";

import { useMemo, useState } from "react";
import {
  Code2,
  Globe,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

interface EndpointDoc {
  method: "GET" | "POST";
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  exampleResponse: string;
  curlExample: string;
  pythonExample: string;
  jsExample: string;
}

function buildEndpoints(baseUrl: string): EndpointDoc[] {
  const B = baseUrl.replace(/\/+$/, ""); // strip trailing slash
  return [
    {
      method: "GET",
      path: "/api/health",
      description: "Health check. Status koneksi database, jumlah kota, timestamp data terakhir.",
      params: [],
      exampleResponse: JSON.stringify({
        status: "ok",
        db_connected: true,
        cities_count: 38,
        last_weather_time: "2026-07-15T11:00:00+00:00",
      }, null, 2),
      curlExample: `curl -X GET "${B}/api/health"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/health")
data = resp.json()
print(f"Status: {data['status']}, Cities: {data['cities_count']}")`,
      jsExample: `const resp = await fetch("${B}/api/health");
const data = await resp.json();
console.log(\`Status: \${data.status}\`);`,
    },
    {
      method: "GET",
      path: "/api/cities",
      description: "Daftar 38 ibu kota provinsi Indonesia. Bisa difilter dengan query ?province=.",
      params: [
        { name: "province", type: "string", required: false, description: "Filter provinsi (case-insensitive, partial match)." },
      ],
      exampleResponse: JSON.stringify([
        { id: 11, province: "DKI Jakarta", city: "Jakarta", latitude: -6.21462, longitude: 106.84513, timezone: "Asia/Jakarta" },
        { id: 15, province: "Jawa Timur", city: "Surabaya", latitude: -7.24917, longitude: 112.75083, timezone: "Asia/Jakarta" },
      ], null, 2),
      curlExample: `curl -X GET "${B}/api/cities?province=Jawa"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/cities", params={"province": "Jawa"})
cities = resp.json()
for c in cities:
    print(f"{c['id']}: {c['city']} ({c['province']})")`,
      jsExample: `const resp = await fetch("${B}/api/cities?province=Jawa");
const cities = await resp.json();
cities.forEach(c => console.log(\`\${c.id}: \${c.city}\`));`,
    },
    {
      method: "GET",
      path: "/api/cities/{city_id}",
      description: "Detail satu kota + data cuaca terkininya.",
      params: [
        { name: "city_id", type: "integer", required: true, description: "ID kota (path parameter)." },
      ],
      exampleResponse: JSON.stringify({
        id: 11, province: "DKI Jakarta", city: "Jakarta", latitude: -6.21462, longitude: 106.84513, timezone: "Asia/Jakarta",
        latest_weather: { temperature: 29.5, humidity: 78, weather_description: "Mendung" },
      }, null, 2),
      curlExample: `curl -X GET "${B}/api/cities/11"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/cities/11")
city = resp.json()
w = city.get('latest_weather')
if w: print(f"{city['city']}: {w['temperature']}°C")`,
      jsExample: `const resp = await fetch("${B}/api/cities/11");
const city = await resp.json();
console.log(\`\${city.city}: \${city.latest_weather?.temperature}°C\`);`,
    },
    {
      method: "GET",
      path: "/api/weather/current",
      description: "Cuaca terkini untuk SEMUA 38 kota. Satu query PostgreSQL (DISTINCT ON) — sangat cepat.",
      params: [],
      exampleResponse: JSON.stringify([
        { id: 1, city_id: 11, city: "Jakarta", province: "DKI Jakarta", datetime: "2026-07-15T11:00:00+00:00", temperature: 29.5, humidity: 78, pressure: 1011.2, wind_speed: 12.4, wind_direction: 270, visibility: 8.5, cloud: 85, rainfall: 0.0, weather_code: 3, weather_description: "Mendung" },
      ], null, 2),
      curlExample: `curl -X GET "${B}/api/weather/current"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/weather/current")
weather = resp.json()
for w in weather:
    print(f"{w['city']}: {w['temperature']}°C — {w['weather_description']}")`,
      jsExample: `const resp = await fetch("${B}/api/weather/current");
const weather = await resp.json();
weather.forEach(w => console.log(\`\${w.city}: \${w.temperature}°C\`));`,
    },
    {
      method: "GET",
      path: "/api/weather/current/{city_id}",
      description: "Cuaca terkini untuk satu kota.",
      params: [
        { name: "city_id", type: "integer", required: true, description: "ID kota (path parameter)." },
      ],
      exampleResponse: JSON.stringify({ id: 1, city_id: 11, city: "Jakarta", province: "DKI Jakarta", datetime: "2026-07-15T11:00:00+00:00", temperature: 29.5, humidity: 78, pressure: 1011.2, wind_speed: 12.4, wind_direction: 270, visibility: 8.5, cloud: 85, rainfall: 0.0, weather_code: 3, weather_description: "Mendung" }, null, 2),
      curlExample: `curl -X GET "${B}/api/weather/current/11"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/weather/current/11")
w = resp.json()
print(f"{w['city']}: {w['temperature']}°C")`,
      jsExample: `const resp = await fetch("${B}/api/weather/current/11");
const w = await resp.json();
console.log(\`\${w.city}: \${w.temperature}°C\`);`,
    },
    {
      method: "GET",
      path: "/api/history/{city_id}",
      description: "Data historis cuaca per jam dari Supabase PostgreSQL. Sumber: Open-Meteo Forecast API (live) + Historical API (backfill).",
      params: [
        { name: "city_id", type: "integer", required: true, description: "ID kota (path parameter)." },
        { name: "days", type: "integer", required: false, description: "Jumlah hari ke belakang (default: 30, maks: 365)." },
      ],
      exampleResponse: JSON.stringify([
        { id: 1, city_id: 11, city: "Jakarta", province: "DKI Jakarta", datetime: "2026-07-14T10:00:00+00:00", temperature: 28.1, humidity: 82, pressure: 1010.5, wind_speed: 8.2, wind_direction: 180, visibility: 10.0, cloud: 70, rainfall: 1.2, weather_code: 61, weather_description: "Hujan Ringan" },
      ], null, 2),
      curlExample: `curl -X GET "${B}/api/history/11?days=7"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/history/11", params={"days": 7})
history = resp.json()
print(f"{len(history)} baris data — suhu rata-rata: {sum(h['temperature'] for h in history)/len(history):.1f}°C")`,
      jsExample: `const resp = await fetch("${B}/api/history/11?days=7");
const history = await resp.json();
console.log(\`\${history.length} baris data\`);`,
    },
    {
      method: "GET",
      path: "/api/forecast/{city_id}",
      description: "Forecast AI (Prophet) per kota. Model di-load on-demand dari JSON, prediksi di-generate real-time. Hanya suhu — model humidity & precipitation belum dilatih.",
      params: [
        { name: "city_id", type: "integer", required: true, description: "ID kota (path parameter)." },
        { name: "hours", type: "integer", required: false, description: "Jam ke depan (default: 24, maks: 168 = 7 hari)." },
        { name: "target", type: "string", required: false, description: "Variabel: temperature_2m (default) | relative_humidity_2m | precipitation." },
      ],
      exampleResponse: JSON.stringify({
        city_id: 11, city: "Jakarta", model_version: "v1", generated_at: "2026-07-15T11:00:00+00:00", hours: 6,
        forecast: [
          { forecast_time: "2026-07-15T12:00:00", temperature: 30.1, humidity: null, rainfall: null },
          { forecast_time: "2026-07-15T13:00:00", temperature: 30.8, humidity: null, rainfall: null },
        ],
      }, null, 2),
      curlExample: `curl -X GET "${B}/api/forecast/11?hours=24"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/forecast/11", params={"hours": 24})
fc = resp.json()
for p in fc['forecast']:
    print(f"{p['forecast_time']}: {p['temperature']}°C")`,
      jsExample: `const resp = await fetch("${B}/api/forecast/11?hours=24");
const fc = await resp.json();
fc.forecast.forEach(p => console.log(\`\${p.forecast_time}: \${p.temperature}°C\`));`,
    },
    {
      method: "GET",
      path: "/api/analytics/summary",
      description: "Ringkasan nasional: suhu rata-rata, kota terpanas/terdingin, kelembapan rata-rata. Data dari 1 jam terakhir.",
      params: [],
      exampleResponse: JSON.stringify({
        avg_temperature: 27.3, avg_humidity: 78.5, total_cities_with_data: 38,
        hottest_city: { city_id: 15, city: "Surabaya", province: "Jawa Timur", temperature: 33.2 },
        coldest_city: { city_id: 37, city: "Nabire", province: "Papua Tengah", temperature: 21.5 },
      }, null, 2),
      curlExample: `curl -X GET "${B}/api/analytics/summary"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/analytics/summary")
s = resp.json()
print(f"Rata-rata: {s['avg_temperature']}°C, Terpanas: {s['hottest_city']['city']} ({s['hottest_city']['temperature']}°C)")`,
      jsExample: `const resp = await fetch("${B}/api/analytics/summary");
const s = await resp.json();
console.log(\`Avg: \${s.avg_temperature}°C, Hottest: \${s.hottest_city.city}\`);`,
    },
    {
      method: "GET",
      path: "/api/analytics/compare",
      description: "Bandingkan cuaca terkini antar kota (maks 5 kota).",
      params: [
        { name: "cities", type: "string", required: true, description: "ID kota dipisah koma, mis. 11,15 (query param, maks 5)." },
      ],
      exampleResponse: JSON.stringify([
        { city_id: 11, city: "Jakarta", province: "DKI Jakarta", temperature: 29.5, humidity: 78, rainfall: 0.0, wind_speed: 12.4 },
        { city_id: 15, city: "Surabaya", province: "Jawa Timur", temperature: 33.2, humidity: 62, rainfall: 0.0, wind_speed: 15.1 },
      ], null, 2),
      curlExample: `curl -X GET "${B}/api/analytics/compare?cities=11,15"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/analytics/compare", params={"cities": "11,15"})
data = resp.json()
for c in data:
    print(f"{c['city']}: {c['temperature']}°C, {c['humidity']}%")`,
      jsExample: `const resp = await fetch("${B}/api/analytics/compare?cities=11,15");
const data = await resp.json();
data.forEach(c => console.log(\`\${c.city}: \${c.temperature}°C\`));`,
    },
    {
      method: "GET",
      path: "/api/model-metrics",
      description: "Metrik evaluasi model Prophet per kota: MAE, RMSE, MAPE, dan perbandingan vs baseline naif (24 jam sebelumnya).",
      params: [
        { name: "city_id", type: "integer", required: false, description: "Filter kota tertentu (opsional). Kosongkan untuk semua." },
      ],
      exampleResponse: JSON.stringify([
        { id: 1, city_id: 3, city: "Bandar Lampung", province: "Lampung", kolom_target: "temperature_2m", mae: 0.542, rmse: 0.749, mape: 2.02, mae_baseline_naif: 0.646, rmse_baseline_naif: 0.872, lebih_baik_dari_baseline: true, model_version: "v1", updated_at: "2026-07-15T11:41:00+00:00" },
      ], null, 2),
      curlExample: `curl -X GET "${B}/api/model-metrics"`,
      pythonExample: `import requests
resp = requests.get("${B}/api/model-metrics")
metrics = resp.json()
for m in metrics:
    s = "✅" if m['lebih_baik_dari_baseline'] else "⚠️"
    print(f"{s} {m['city']}: MAE={m['mae']}°C (baseline: {m['mae_baseline_naif']}°C)")`,
      jsExample: `const resp = await fetch("${B}/api/model-metrics");
const metrics = await resp.json();
metrics.forEach(m => console.log(\`\${m.city}: MAE=\${m.mae}\`));`,
    },
  ];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
      title="Salin"
    >
      {copied ? (
        <Check size={14} style={{ color: "var(--accent-emerald)" }} />
      ) : (
        <Copy size={14} style={{ color: "var(--text-muted)" }} />
      )}
    </button>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  const [expanded, setExpanded] = useState(false);
  const [codeTab, setCodeTab] = useState<"curl" | "python" | "js">("curl");

  return (
    <div className="glass-card-static overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span
          className="px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            color: "#34d399",
            border: "1px solid rgba(16, 185, 129, 0.25)",
          }}
        >
          {endpoint.method}
        </span>
        <code className="text-sm font-semibold font-mono" style={{ color: "var(--accent-blue)" }}>
          {endpoint.path}
        </code>
        <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {endpoint.description.slice(0, 60)}...
        </span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-sm mt-4 mb-4" style={{ color: "var(--text-secondary)" }}>
            {endpoint.description}
          </p>

          {endpoint.params.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Parameter
              </h4>
              <div className="space-y-2">
                {endpoint.params.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    <code className="text-xs font-mono font-semibold" style={{ color: "var(--accent-cyan)" }}>
                      {p.name}
                    </code>
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                      {p.type}
                    </span>
                    {p.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f87171" }}>
                        required
                      </span>
                    )}
                    <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>
                      {p.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Contoh Kode
              </h4>
              <div className="tab-list">
                {(["curl", "python", "js"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCodeTab(tab)}
                    className={`tab-item ${codeTab === tab ? "active" : ""}`}
                  >
                    {tab === "curl" ? "cURL" : tab === "python" ? "Python" : "JavaScript"}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative rounded-xl p-4 overflow-x-auto" style={{ background: "#0d1117" }}>
              <CopyButton
                text={
                  codeTab === "curl"
                    ? endpoint.curlExample
                    : codeTab === "python"
                    ? endpoint.pythonExample
                    : endpoint.jsExample
                }
              />
              <pre className="text-xs font-mono leading-relaxed" style={{ color: "#c9d1d9" }}>
                <code>
                  {codeTab === "curl"
                    ? endpoint.curlExample
                    : codeTab === "python"
                    ? endpoint.pythonExample
                    : endpoint.jsExample}
                </code>
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Contoh Response
            </h4>
            <div className="relative rounded-xl p-4 overflow-x-auto" style={{ background: "#0d1117" }}>
              <CopyButton text={endpoint.exampleResponse} />
              <pre className="text-xs font-mono leading-relaxed" style={{ color: "#c9d1d9" }}>
                <code>{endpoint.exampleResponse}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiExplorerClient() {
  const endpoints = useMemo(() => buildEndpoints(BACKEND_URL), []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
        >
          <Code2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">API Explorer</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Dokumentasi REST API WeatherInsight Indonesia — 10 endpoint
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="glass-card-static p-5 mb-8"
        style={{ borderLeft: "3px solid var(--accent-blue)" }}
      >
        <div className="flex items-start gap-4">
          <Globe size={20} style={{ color: "var(--accent-blue)" }} className="mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold mb-1">Base URL</h3>
            <code className="text-sm font-mono px-2 py-1 rounded-lg" style={{ background: "var(--bg-secondary)", color: "var(--accent-cyan)" }}>
              {BACKEND_URL}
            </code>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Semua endpoint mengembalikan JSON. Tidak diperlukan autentikasi untuk akses publik.
              Swagger docs interaktif tersedia di{" "}
              <code className="px-1 py-0.5 rounded" style={{ background: "var(--bg-card)" }}>/docs</code>.
            </p>

            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Zap size={12} style={{ color: "var(--accent-amber)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>FastAPI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database size={12} style={{ color: "var(--accent-emerald)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Supabase PostgreSQL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} style={{ color: "var(--accent-violet)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Prophet ML v1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} style={{ color: "var(--accent-blue)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Data hourly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {endpoints.map((ep) => (
          <EndpointCard key={ep.path} endpoint={ep} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          API dokumentasi lengkap (Swagger/OpenAPI) tersedia di{" "}
          <a
            href={`${BACKEND_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
            style={{ color: "var(--accent-blue)" }}
          >
            /docs <ExternalLink size={10} />
          </a>
        </p>
      </div>
    </div>
  );
}
