import { useMemo, useState } from "react";
import { Hospital, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const REGIONS = [
  { region: "Maharashtra", capacity: 18500, occupied: 17200 },
  { region: "Delhi NCR", capacity: 9800, occupied: 9100 },
  { region: "Karnataka", capacity: 11200, occupied: 8400 },
  { region: "Tamil Nadu", capacity: 14000, occupied: 9700 },
  { region: "West Bengal", capacity: 8900, occupied: 7800 },
  { region: "Kerala", capacity: 6500, occupied: 3900 },
  { region: "Gujarat", capacity: 10300, occupied: 7100 },
  { region: "Telangana", capacity: 7200, occupied: 5800 },
];

export default function HospitalLoad() {
  const [data] = useState(REGIONS);
  const total = useMemo(() => data.reduce((a, r) => ({ cap: a.cap + r.capacity, occ: a.occ + r.occupied }), { cap: 0, occ: 0 }), [data]);
  const utilPct = (total.occ / total.cap) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="National Beds" value={total.cap.toLocaleString()} />
        <Stat label="Occupied" value={total.occ.toLocaleString()} color="text-moderate" />
        <Stat label="Utilization" value={`${utilPct.toFixed(1)}%`} color={utilPct > 90 ? "text-red" : utilPct > 70 ? "text-moderate" : "text-mild"} />
        <Stat label="Critical Regions" value={data.filter(r => r.occupied / r.capacity > 0.9).length} color="text-red" />
      </div>

      <div className="sentinel-card">
        <div className="flex items-center gap-2 mb-4"><Hospital className="w-4 h-4 text-teal" /><span className="font-display">Regional Hospital Load</span></div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="rgba(99,130,175,0.1)" />
            <XAxis type="number" stroke="#5C6476" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <YAxis type="category" dataKey="region" stroke="#9BA3B5" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: "#1A2539", border: "1px solid rgba(99,130,175,0.28)" }} />
            <Bar dataKey="capacity" fill="rgba(0,196,204,0.2)" name="Capacity" />
            <Bar dataKey="occupied" name="Occupied">
              {data.map((r, i) => {
                const u = r.occupied / r.capacity;
                return <Cell key={i} fill={u > 0.9 ? "#E8202A" : u > 0.7 ? "#F59E0B" : "#10B981"} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="sentinel-card bg-red-dim border-red/30">
        <div className="flex gap-3"><AlertTriangle className="w-5 h-5 text-red flex-shrink-0" />
          <div>
            <div className="font-display text-red">Collapse Risk Alert</div>
            <div className="text-sm mt-1 text-muted-foreground">
              {data.filter(r => r.occupied / r.capacity > 0.9).length} region(s) above 90% ICU utilization. Recommend emergency resource reallocation and patient transfer protocols.
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
