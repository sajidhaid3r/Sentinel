import { useMemo, useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useEpidemic } from "@/context/EpidemicContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";

function runSEIR({ N, I0, R0, sigma, gamma, days, intervention }: any) {
  const beta = (R0 * gamma);
  let S = N - I0, E = 0, I = I0, R = 0;
  const out: any[] = [];
  for (let d = 0; d <= days; d++) {
    const effBeta = beta * (d >= intervention.start ? (1 - intervention.reduction / 100) : 1);
    const newE = (effBeta * S * I) / N;
    const newI = sigma * E;
    const newR = gamma * I;
    S = Math.max(0, S - newE);
    E = Math.max(0, E + newE - newI);
    I = Math.max(0, I + newI - newR);
    R = Math.max(0, R + newR);
    out.push({ day: d, S: Math.round(S), E: Math.round(E), I: Math.round(I), R: Math.round(R), icu: Math.round(I * 0.05), hospital: Math.round(I * 0.18) });
  }
  return out;
}

export default function SimulationPanel() {
  const { pandemic } = useEpidemic();
  const [population, setPopulation] = useState(1_400_000_000);
  const [I0, setI0] = useState(100);
  const [R0, setR0] = useState(pandemic.R0);
  const [incubation, setIncubation] = useState(pandemic.incubation);
  const [infectious, setInfectious] = useState(pandemic.infectious);
  const [days, setDays] = useState(180);
  const [interventionStart, setInterventionStart] = useState(30);
  const [interventionReduction, setInterventionReduction] = useState(40);
  const [icuBeds, setIcuBeds] = useState(95000);

  useEffect(() => {
    setR0(pandemic.R0); setIncubation(pandemic.incubation); setInfectious(pandemic.infectious);
  }, [pandemic.name]);


  const data = useMemo(() => runSEIR({
    N: population, I0, R0,
    sigma: 1 / incubation, gamma: 1 / infectious, days,
    intervention: { start: interventionStart, reduction: interventionReduction },
  }), [population, I0, R0, incubation, infectious, days, interventionStart, interventionReduction]);

  const peak = useMemo(() => data.reduce((m, d) => d.I > m.I ? d : m, data[0]), [data]);
  const totalInfected = data[data.length - 1]?.R || 0;
  const overloadDay = data.find(d => d.icu > icuBeds);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="sentinel-card space-y-4">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-teal" /><span className="font-display">Epidemic Parameters</span></div>

          <div>
            <Label>Pandemic</Label>
            <div className="text-sm font-mono text-teal px-3 py-2 rounded-md bg-[var(--input-bg)] border border-border">{pandemic.name}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Change pandemic from the top selector to update all tabs.</div>
          </div>


          <SliderRow label="Population" v={population} setV={setPopulation} min={10_000} max={2_000_000_000} step={10000} fmt={(v: number) => v.toLocaleString()} />
          <SliderRow label="Initial Infected (I₀)" v={I0} setV={setI0} min={1} max={10000} step={1} />
          <SliderRow label="R₀ (Basic Reproduction)" v={R0} setV={setR0} min={0.5} max={18} step={0.1} fmt={(v: number) => v.toFixed(1)} />
          <SliderRow label="Incubation (days)" v={incubation} setV={setIncubation} min={1} max={21} step={0.1} fmt={(v: number) => v.toFixed(1)} />
          <SliderRow label="Infectious Period (days)" v={infectious} setV={setInfectious} min={1} max={30} step={0.1} fmt={(v: number) => v.toFixed(1)} />
          <SliderRow label="Simulation Days" v={days} setV={setDays} min={30} max={730} step={10} />
          <div className="border-t border-border pt-4">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Intervention (NPIs)</div>
            <SliderRow label="Start Day" v={interventionStart} setV={setInterventionStart} min={0} max={days} step={1} />
            <SliderRow label="Transmission Reduction (%)" v={interventionReduction} setV={setInterventionReduction} min={0} max={95} step={1} />
          </div>
          <SliderRow label="National ICU Beds" v={icuBeds} setV={setIcuBeds} min={1000} max={500000} step={1000} fmt={(v: number) => v.toLocaleString()} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Peak Active" value={peak.I.toLocaleString()} sub={`Day ${peak.day}`} color="text-red" />
            <Stat label="Total Infected" value={totalInfected.toLocaleString()} sub={`${((totalInfected / population) * 100).toFixed(1)}% pop.`} color="text-moderate" />
            <Stat label="Peak ICU Demand" value={peak.icu.toLocaleString()} sub={`Capacity: ${icuBeds.toLocaleString()}`} color="text-purple" />
            <Stat label="ICU Overload" value={overloadDay ? `Day ${overloadDay.day}` : "Within capacity"} sub={overloadDay ? "Collapse risk" : "—"} color={overloadDay ? "text-red" : "text-mild"} />
          </div>

          <div className="sentinel-card">
            <div className="flex items-center justify-between mb-3">
              <div><div className="font-display">SEIR Model — {pandemic}</div><div className="text-xs font-mono text-muted-foreground">Susceptible / Exposed / Infected / Recovered</div></div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E8202A" stopOpacity={0.6}/><stop offset="95%" stopColor="#E8202A" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(99,130,175,0.1)" />
                <XAxis dataKey="day" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <YAxis stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)", borderRadius: 8 }} labelStyle={{ color: "#9BA3B5" }} />
                <Legend />
                <Area type="monotone" dataKey="I" stroke="#E8202A" fill="url(#gI)" name="Infected" />
                <Area type="monotone" dataKey="R" stroke="#10B981" fill="url(#gR)" name="Recovered" />
                <Line type="monotone" dataKey="E" stroke="#F59E0B" dot={false} name="Exposed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="sentinel-card">
            <div className="font-display mb-3">Hospital & ICU Demand Forecast</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid stroke="rgba(99,130,175,0.1)" />
                <XAxis dataKey="day" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <YAxis stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} />
                <Legend />
                <Line type="monotone" dataKey="hospital" stroke="#3B82F6" dot={false} name="Hospitalized" />
                <Line type="monotone" dataKey="icu" stroke="#8B5CF6" dot={false} name="ICU Demand" />
                <Line type="monotone" dataKey={() => icuBeds} stroke="#E8202A" strokeDasharray="5 5" dot={false} name="ICU Capacity" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: any) { return <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">{children}</div>; }
function SliderRow({ label, v, setV, min, max, step, fmt }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5"><Label>{label}</Label><span className="font-mono text-xs text-teal">{fmt ? fmt(v) : v}</span></div>
      <Slider value={[v]} onValueChange={(x) => setV(x[0])} min={min} max={max} step={step} />
    </div>
  );
}
function Stat({ label, value, sub, color }: any) {
  return (
    <div className="sentinel-card">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono text-2xl mt-1 ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
