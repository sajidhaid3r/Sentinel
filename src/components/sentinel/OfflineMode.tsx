import { useEffect, useState } from "react";
import { Wifi, WifiOff, Hospital, Cross, Pill, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Place = { id: string; name: string; type: string; lat: number; lon: number; address?: string };

export default function OfflineMode() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [cache, setCache] = useState<{ at: number; center: [number, number]; places: Place[] } | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    try { const c = localStorage.getItem("sentinel_places_cache"); if (c) { const p = JSON.parse(c); setCache(p); setLastSync(new Date(p.at).toLocaleString()); } } catch {}
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  async function syncNow(lat?: number, lon?: number) {
    setLoading(true);
    try {
      let la = lat, lo = lon;
      if (la == null || lo == null) {
        if (query.trim()) {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
          const d = await r.json();
          if (d[0]) { la = parseFloat(d[0].lat); lo = parseFloat(d[0].lon); }
        }
      }
      if (la == null || lo == null) { setLoading(false); return; }
      const q = `[out:json][timeout:25];(node["amenity"~"hospital|clinic|pharmacy"](around:5000,${la},${lo}););out body 100;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
      const data = await res.json();
      const places: Place[] = (data.elements || []).map((e: any) => ({
        id: String(e.id),
        name: e.tags?.name || `Unnamed ${e.tags?.amenity}`,
        type: e.tags?.amenity === "hospital" ? "hospital" : e.tags?.amenity === "pharmacy" ? "drugstore" : "clinic",
        lat: e.lat, lon: e.lon,
        address: [e.tags?.["addr:street"], e.tags?.["addr:city"]].filter(Boolean).join(", "),
      }));
      const payload = { at: Date.now(), center: [la, lo] as [number, number], places };
      localStorage.setItem("sentinel_places_cache", JSON.stringify(payload));
      setCache(payload);
      setLastSync(new Date(payload.at).toLocaleString());
    } finally { setLoading(false); }
  }

  function useGeo() {
    navigator.geolocation.getCurrentPosition(
      (p) => syncNow(p.coords.latitude, p.coords.longitude),
      (e) => console.error(e)
    );
  }

  const grouped = {
    hospital: cache?.places.filter(p => p.type === "hospital") || [],
    clinic: cache?.places.filter(p => p.type === "clinic") || [],
    drugstore: cache?.places.filter(p => p.type === "drugstore") || [],
  };

  return (
    <div className="space-y-4">
      <div className="sentinel-card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${online ? "bg-mild/10 border border-mild/30" : "bg-red-dim border border-red/30"}`}>
              {online ? <Wifi className="w-5 h-5 text-mild" /> : <WifiOff className="w-5 h-5 text-red" />}
            </div>
            <div>
              <div className="font-display text-lg">{online ? "Online — Live Sync Active" : "Offline — Showing Cached Data"}</div>
              <div className="text-xs font-mono text-muted-foreground">
                {lastSync ? `Last sync: ${lastSync}` : "No data cached yet"}
              </div>
            </div>
          </div>
          {online && (
            <div className="flex gap-2 items-end">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Sync this location"
                className="bg-[var(--input-bg)] w-56" />
              <Button onClick={() => syncNow()} disabled={loading} className="bg-teal text-[#001012] hover:bg-teal/90">
                {loading ? "Syncing..." : "Sync"}
              </Button>
              <Button onClick={useGeo} variant="outline" className="border-teal-border text-teal"><MapPin className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </div>

      <div className="sentinel-card bg-moderate/5 border-moderate/30">
        <div className="text-sm">
          <strong className="text-moderate">How Offline Mode Works:</strong> When connected, SENTINEL syncs nearby healthcare facilities to your device. If the network drops, the cached registry remains available so first responders and citizens always have access to hospital, clinic, and pharmacy locations.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <FacilityGroup icon={Hospital} color="#E8202A" title="Hospitals" items={grouped.hospital} />
        <FacilityGroup icon={Cross} color="#00C4CC" title="Clinics" items={grouped.clinic} />
        <FacilityGroup icon={Pill} color="#8B5CF6" title="Drug Stores" items={grouped.drugstore} />
      </div>
    </div>
  );
}

function FacilityGroup({ icon: Icon, color, title, items }: any) {
  return (
    <div className="sentinel-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color }} /><span className="font-display">{title}</span></div>
        <span className="font-mono text-xl" style={{ color }}>{items.length}</span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-auto pr-1">
        {items.length === 0 ? <div className="text-xs text-muted-foreground">No facilities cached</div> :
          items.map((p: Place) => (
            <div key={p.id} className="p-3 bg-[var(--input-bg)] rounded-md">
              <div className="text-sm font-medium">{p.name}</div>
              {p.address && <div className="text-xs text-muted-foreground mt-0.5">{p.address}</div>}
              <div className="text-[10px] font-mono text-muted-foreground mt-1">{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
