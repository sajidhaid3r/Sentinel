import { useMemo, useState } from "react";
import { Syringe } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Region = { name: string; population: number; risk: number; coldStorage: number };
const REGIONS: Region[] = [
  { name: "Maharashtra", population: 124_900_000, risk: 0.82, coldStorage: 0.9 },
  { name: "Delhi NCR", population: 31_900_000, risk: 0.91, coldStorage: 0.95 },
  { name: "Karnataka", population: 67_500_000, risk: 0.65, coldStorage: 0.85 },
  { name: "Tamil Nadu", population: 79_100_000, risk: 0.58, coldStorage: 0.88 },
  { name: "West Bengal", population: 99_600_000, risk: 0.74, coldStorage: 0.72 },
  { name: "Kerala", population: 35_700_000, risk: 0.48, coldStorage: 0.95 },
  { name: "Gujarat", population: 71_500_000, risk: 0.61, coldStorage: 0.86 },
  { name: "Bihar", population: 124_800_000, risk: 0.79, coldStorage: 0.55 },
];

// Weighted optimization: allocation_i = totalDoses * (w_i / Σw),  w = population * risk * coldStorage
function optimize(doses: number, regions: Region[], priorityWeight: number) {
  const weights = regions.map(r => {
    const popScore = r.population / 1e8;
    const w = popScore * (1 + priorityWeight * r.risk) * r.coldStorage;
    return w;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return regions.map((r, i) => ({
    name: r.name,
    allocation: Math.round(doses * (weights[i] / sum)),
    risk: r.risk,
    population: r.population,
  }));
}

export default function VaccineDistribution() {
  const [doses, setDoses] = useState(50_000_000);
  const [priority, setPriority] = useState(2);
  const allocations = useMemo(() => optimize(doses, REGIONS, priority).sort((a, b) => b.allocation - a.allocation), [doses, priority]);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="sentinel-card space-y-4">
          <div className="flex items-center gap-2"><Syringe className="w-4 h-4 text-teal" /><span className="font-display">Distribution Optimizer</span></div>
          <div>
            <div className="flex justify-between mb-1.5"><span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Total Doses</span>
              <span className="font-mono text-xs text-teal">{doses.toLocaleString()}</span></div>
            <Slider value={[doses]} onValueChange={v => setDoses(v[0])} min={1_000_000} max={500_000_000} step={1_000_000} />
          </div>
          <div>
            <div className="flex justify-between mb-1.5"><span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Risk Priority Weight</span>
              <span className="font-mono text-xs text-teal">{priority.toFixed(1)}×</span></div>
            <Slider value={[priority]} onValueChange={v => setPriority(v[0])} min={0} max={5} step={0.1} />
            <div className="text-[10px] text-muted-foreground mt-1">Higher = more doses to high-risk regions</div>
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-xs font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">Coverage</span><span className="text-teal">{((doses / REGIONS.reduce((a, r) => a + r.population, 0)) * 100).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Algorithm</span><span>Weighted Pop × Risk × ColdChain</span></div>
          </div>
        </div>

        <div className="sentinel-card">
          <div className="font-display mb-3">Optimal Allocation by Region</div>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={allocations} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid stroke="rgba(99,130,175,0.1)" />
              <XAxis type="number" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="#9BA3B5" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} formatter={(v: any) => v.toLocaleString()} />
              <Bar dataKey="allocation">
                {allocations.map((a, i) => <Cell key={i} fill={a.risk > 0.8 ? "#E8202A" : a.risk > 0.6 ? "#F59E0B" : "#00C4CC"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
