import { useMemo, useState } from "react";
import { Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

// Simple exponential-then-logistic forecast based on recent case growth rate
function forecast(seriesRecent: number[], horizon: number, K: number) {
  // Estimate r from log-linear regression
  const n = seriesRecent.length;
  const xs = seriesRecent.map((_, i) => i);
  const ys = seriesRecent.map(v => Math.log(Math.max(1, v)));
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const r = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const out: any[] = [];
  let v = seriesRecent[seriesRecent.length - 1];
  // logistic growth dN/dt = r*N*(1 - N/K)
  for (let d = 1; d <= horizon; d++) {
    v = v + r * v * (1 - v / K);
    v = Math.min(K, Math.max(0, v));
    out.push({ day: d, predicted: Math.round(v), lower: Math.round(v * 0.78), upper: Math.round(v * 1.25) });
  }
  return { out, r };
}

const SAMPLE = [820, 940, 1080, 1290, 1510, 1820, 2180, 2640, 3110, 3680, 4350, 5120, 6080, 7240];

export default function AIOutbreak() {
  const [series, setSeries] = useState(SAMPLE.join(","));
  const [carrying, setCarrying] = useState(2_000_000);

  const parsed = useMemo(() => series.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)), [series]);
  const { out, r } = useMemo(() => forecast(parsed.length >= 3 ? parsed : SAMPLE, 30, carrying), [parsed, carrying]);
  const historical = parsed.map((v, i) => ({ day: i - parsed.length + 1, actual: v }));
  const full = [...historical, ...out.map(o => ({ day: o.day, predicted: o.predicted, lower: o.lower, upper: o.upper }))];

  const doublingTime = r > 0 ? Math.log(2) / r : Infinity;
  const peakDay = out.reduce((m, o) => o.predicted > m.predicted ? o : m, out[0]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Daily Growth Rate" value={`${(r * 100).toFixed(1)}%`} color={r > 0.1 ? "text-red" : "text-moderate"} />
        <Stat label="Doubling Time" value={isFinite(doublingTime) ? `${doublingTime.toFixed(1)} days` : "—"} color="text-purple" />
        <Stat label="30-day Forecast" value={out[out.length - 1].predicted.toLocaleString()} color="text-teal" />
        <Stat label="Saturation Risk" value={`${((out[out.length - 1].predicted / carrying) * 100).toFixed(1)}%`} color="text-moderate" />
      </div>

      <div className="sentinel-card">
        <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-teal" /><span className="font-display">AI Outbreak Forecast</span></div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Historical Daily Cases (comma-separated)</div>
            <Input value={series} onChange={e => setSeries(e.target.value)} className="bg-[var(--input-bg)] font-mono text-xs" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Susceptible Carrying Capacity (K)</div>
            <Input type="number" value={carrying} onChange={e => setCarrying(parseInt(e.target.value) || 0)} className="bg-[var(--input-bg)] font-mono text-xs" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={full}>
            <defs><linearGradient id="conf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C4CC" stopOpacity={0.3}/><stop offset="95%" stopColor="#00C4CC" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="rgba(99,130,175,0.1)" />
            <XAxis dataKey="day" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <YAxis stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v} />
            <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#conf)" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#0D1421" />
            <Line type="monotone" dataKey="actual" stroke="#EEF0F3" strokeWidth={2} dot={false} name="Actual" />
            <Line type="monotone" dataKey="predicted" stroke="#00C4CC" strokeWidth={2} strokeDasharray="5 5" dot={false} name="AI Forecast" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="text-[10px] font-mono text-muted-foreground mt-2">Model: log-linear regression on growth + logistic saturation (K). Confidence band ±22%.</div>
      </div>

      <div className="sentinel-card bg-moderate/5 border-moderate/30">
        <div className="flex gap-3"><AlertTriangle className="w-5 h-5 text-moderate flex-shrink-0" />
          <div>
            <div className="font-display text-moderate">Intervention Recommendation</div>
            <div className="text-sm mt-1 text-muted-foreground">
              {r > 0.15 ? "Severe exponential growth detected. Recommend immediate NPIs: school closures, gathering limits, mandatory masking, and accelerated vaccination rollout in high-risk zones." :
                r > 0.05 ? "Moderate growth. Recommend enhanced surveillance, targeted testing, and contact tracing." :
                  "Outbreak stabilizing. Maintain current measures and monitor for variant emergence."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <div className="sentinel-card">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono text-2xl mt-1 ${color || "text-foreground"}`}>{value}</div>
    </div>
  );
}
