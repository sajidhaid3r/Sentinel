import { useMemo } from "react";
import { useEpidemic } from "@/context/EpidemicContext";
import { Syringe, Calendar, Shield, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";

const REGIONS = [
  { name: "Maharashtra", pop: 124_900_000 },
  { name: "Delhi NCR", pop: 31_900_000 },
  { name: "Karnataka", pop: 67_500_000 },
  { name: "Tamil Nadu", pop: 79_100_000 },
  { name: "West Bengal", pop: 99_600_000 },
  { name: "Kerala", pop: 35_700_000 },
  { name: "Gujarat", pop: 71_500_000 },
  { name: "Bihar", pop: 124_800_000 },
];

export default function VaccinationIntel() {
  const { pandemic } = useEpidemic();

  const data = useMemo(() => REGIONS.map(r => ({
    name: r.name,
    required: Math.round(r.pop * pandemic.vaccine.doses),
    delivered: Math.round(r.pop * pandemic.vaccine.doses * (0.4 + Math.random() * 0.5)),
  })), [pandemic.name]);

  const efficacyCurve = useMemo(() => {
    const days = 365;
    const out = [];
    for (let d = 0; d <= days; d += 15) {
      // logistic decay model: peaks at day 30, declines slowly
      const peak = pandemic.vaccine.efficacy * 100;
      const t = d / 90;
      const eff = d < 30 ? (d / 30) * peak : peak * Math.exp(-0.002 * (d - 30));
      out.push({ day: d, efficacy: Number(eff.toFixed(1)) });
    }
    return out;
  }, [pandemic.name]);

  const totalRequired = data.reduce((a, r) => a + r.required, 0);
  const totalDelivered = data.reduce((a, r) => a + r.delivered, 0);
  const coverage = totalRequired ? (totalDelivered / totalRequired) * 100 : 0;

  if (pandemic.vaccine.doses === 0) {
    return (
      <div className="sentinel-card">
        <div className="font-display text-lg mb-2">No Approved Vaccine</div>
        <div className="text-muted-foreground text-sm">
          No vaccine currently exists for <span className="text-teal">{pandemic.name}</span>. Control relies on non-pharmaceutical interventions: isolation, contact tracing, vector control, and PPE.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Syringe} label="Doses / Person" value={pandemic.vaccine.doses} />
        <Stat icon={Calendar} label="Gap (days)" value={pandemic.vaccine.gapDays} />
        <Stat icon={Shield} label="Peak Efficacy" value={`${(pandemic.vaccine.efficacy * 100).toFixed(0)}%`} color="text-mild" />
        <Stat icon={TrendingUp} label="National Coverage" value={`${coverage.toFixed(1)}%`} color={coverage > 70 ? "text-mild" : coverage > 40 ? "text-moderate" : "text-red"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="sentinel-card">
          <div className="font-display mb-3">Doses Required vs Delivered — {pandemic.name}</div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(99,130,175,0.1)" />
              <XAxis dataKey="name" stroke="#9BA3B5" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke="#5C6476" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} formatter={(v: any) => v.toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="required" fill="rgba(0,196,204,0.3)" name="Required" />
              <Bar dataKey="delivered" name="Delivered">
                {data.map((d, i) => {
                  const c = d.delivered / d.required;
                  return <Cell key={i} fill={c > 0.7 ? "#10B981" : c > 0.4 ? "#F59E0B" : "#E8202A"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sentinel-card">
          <div className="font-display mb-3">Efficacy Decay Over Time</div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={efficacyCurve}>
              <CartesianGrid stroke="rgba(99,130,175,0.1)" />
              <XAxis dataKey="day" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} label={{ value: "Days post-dose", position: "insideBottom", offset: -5, fill: "#5C6476", fontSize: 10 }} />
              <YAxis stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} unit="%" />
              <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} />
              <Line type="monotone" dataKey="efficacy" stroke="#00C4CC" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">
            Booster recommended at day 180 for {pandemic.name}. Schedule: {pandemic.vaccine.doses} dose(s), {pandemic.vaccine.gapDays}-day gap.
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="sentinel-card">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className={`font-mono text-2xl mt-1 ${color || "text-foreground"}`}>{value}</div>
    </div>
  );
}
