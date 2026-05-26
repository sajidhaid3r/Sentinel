import { useEpidemic } from "@/context/EpidemicContext";
import { Activity } from "lucide-react";

export default function EpidemicSelector() {
  const { pandemic, pandemics, setPandemicName } = useEpidemic();
  return (
    <div className="flex items-center gap-2">
      <Activity className="w-4 h-4 text-teal" />
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">Pandemic</span>
      <select
        value={pandemic.name}
        onChange={e => setPandemicName(e.target.value)}
        className="bg-[var(--input-bg)] border border-border rounded-md px-2.5 py-1.5 text-sm font-mono text-teal focus:outline-none focus:border-teal-border"
      >
        {pandemics.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
    </div>
  );
}
