import { useMemo } from "react";
import { useEpidemic } from "@/context/EpidemicContext";
import { AlertTriangle, Users, ShieldAlert, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DISTRICTS = [
  { name: "Mumbai Central", density: 27200, capacity: 1800 },
  { name: "Delhi Old City", density: 32100, capacity: 1500 },
  { name: "Kolkata North", density: 24700, capacity: 1200 },
  { name: "Bengaluru East", density: 11200, capacity: 2200 },
  { name: "Chennai South", density: 14800, capacity: 1900 },
  { name: "Hyderabad West", density: 9800, capacity: 2100 },
  { name: "Pune Hinjewadi", density: 8400, capacity: 1700 },
  { name: "Kochi Marine", density: 6200, capacity: 2000 },
  { name: "Ahmedabad East", density: 13500, capacity: 1400 },
  { name: "Jaipur Walled", density: 19800, capacity: 900 },
];

export default function EmergencyResponse() {
  const { pandemic } = useEpidemic();
  const data = useMemo(() => {
    return DISTRICTS.map(d => {
      // load index = density / capacity, weighted by pandemic R0
      const loadIndex = (d.density / d.capacity) * (pandemic.R0 / 2.5);
      const status = loadIndex > 12 ? "critical" : loadIndex > 6 ? "high" : "manageable";
      return { ...d, loadIndex: Number(loadIndex.toFixed(1)), status };
    }).sort((a, b) => b.loadIndex - a.loadIndex);
  }, [pandemic.name]);

  const critical = data.filter(d => d.status === "critical");
  const safe = data.filter(d => d.status === "manageable");

  // suggest transfers from safe to critical
  const transfers = critical.slice(0, 3).map((c, i) => ({
    from: safe[i % safe.length]?.name ?? "—",
    to: c.name,
    units: Math.round(c.density / 1000),
  }));

  const tactics = [
    pandemic.R0 > 3 && "Tiered lockdown — high-density zones first (proven in Wuhan, Lombardy)",
    pandemic.cfr > 0.1 && "Strict cordon sanitaire around hotspot districts (Ebola, Plague playbook)",
    pandemic.vaccine.doses > 0 && pandemic.vaccine.efficacy > 0.7 && "Ring vaccination of contacts and frontline workers (smallpox, Ebola)",
    pandemic.vector.toLowerCase().includes("mosquito") && "Vector control: indoor residual spraying + larval source reduction",
    pandemic.vector.toLowerCase().includes("water") && "Emergency potable water distribution and ORS deployment",
    "Mandatory masking + ventilation upgrades in indoor public spaces",
    "Surge ICU staffing via inter-state transfer and military medical corps",
    "Daily transparent risk communication via state broadcasters",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Districts Tracked" value={data.length} />
        <Stat icon={ShieldAlert} label="Critical Load" value={critical.length} color="text-red" />
        <Stat icon={Users} label="Manageable" value={safe.length} color="text-mild" />
        <Stat icon={AlertTriangle} label="Pandemic" value={pandemic.name} color="text-teal" />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="sentinel-card">
          <div className="font-display mb-1">District Load Index — {pandemic.name}</div>
          <div className="text-xs text-muted-foreground mb-3">Load = (population density / healthcare capacity) × outbreak severity (R₀)</div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid stroke="rgba(99,130,175,0.1)" />
              <XAxis type="number" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <YAxis type="category" dataKey="name" stroke="#9BA3B5" tick={{ fontSize: 11 }} width={110} />
              <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} />
              <Bar dataKey="loadIndex" name="Load Index">
                {data.map((d, i) => <Cell key={i} fill={d.status === "critical" ? "#E8202A" : d.status === "high" ? "#F59E0B" : "#10B981"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="sentinel-card">
            <div className="font-display mb-3">Suggested Resource Redistribution</div>
            <div className="space-y-2">
              {transfers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-md bg-input">
                  <span className="text-mild">{t.from}</span>
                  <ArrowRight className="w-4 h-4 text-teal" />
                  <span className="text-red font-medium">{t.to}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{t.units} units</span>
                </div>
              ))}
              {transfers.length === 0 && <div className="text-sm text-muted-foreground">No transfers needed — all districts within manageable load.</div>}
            </div>
          </div>

          <div className="sentinel-card">
            <div className="font-display mb-3">Recommended Tactics</div>
            <ul className="space-y-2 text-sm">
              {tactics.map((t, i) => (
                <li key={i} className="flex gap-2 text-foreground/90">
                  <span className="text-teal mt-1">▸</span><span>{t}</span>
                </li>
              ))}
            </ul>
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
