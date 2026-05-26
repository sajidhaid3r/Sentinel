import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Crosshair, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Place = { id: string; name: string; type: "hospital" | "clinic" | "pharmacy"; lat: number; lon: number; address?: string };

const COLORS = { hospital: "#E8202A", clinic: "#00C4CC", pharmacy: "#8B5CF6" };

export default function GeoMap() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const Lref = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const facilityLayerRef = useRef<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [filter, setFilter] = useState<"all" | "hospital" | "clinic" | "pharmacy">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      Lref.current = L;
      const map = L.map(ref.current, { zoomControl: true, attributionControl: false }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM" }).addTo(map);
      facilityLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  async function locate() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        setUserPos([lat, lon]);
        const L = Lref.current, map = mapRef.current;
        if (map) {
          map.setView([lat, lon], 13);
          if (userMarkerRef.current) userMarkerRef.current.remove();
          const icon = L.divIcon({ html: `<div class="pulse-dot"></div>`, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
          userMarkerRef.current = L.marker([lat, lon], { icon }).addTo(map).bindPopup("<b>Your location</b>");
        }
        await fetchNearby(lat, lon);
        setLoading(false);
      },
      err => { toast.error("Location permission denied"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fetchNearby(lat: number, lon: number, radiusM = 5000) {
    try {
      const q = `[out:json][timeout:25];(node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radiusM},${lat},${lon}););out body 80;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
      const json = await res.json();
      const items: Place[] = (json.elements || []).map((e: any) => ({
        id: String(e.id),
        name: e.tags?.name || `${e.tags?.amenity || "Facility"}`,
        type: e.tags?.amenity === "pharmacy" ? "pharmacy" : e.tags?.amenity === "hospital" ? "hospital" : "clinic",
        lat: e.lat, lon: e.lon,
        address: [e.tags?.["addr:street"], e.tags?.["addr:city"]].filter(Boolean).join(", "),
      }));
      setPlaces(items);
      try { localStorage.setItem("sentinel-facilities", JSON.stringify({ ts: Date.now(), items, center: [lat, lon] })); } catch {}
      renderFacilities(items);
    } catch {
      toast.error("Failed to fetch nearby facilities");
    }
  }

  function renderFacilities(items: Place[]) {
    const L = Lref.current, layer = facilityLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    items.filter(p => filter === "all" || p.type === filter).forEach(p => {
      const c = COLORS[p.type];
      const icon = L.divIcon({ html: `<div class="facility-dot" style="background:${c};color:${c}"></div>`, className: "", iconSize: [12, 12], iconAnchor: [6, 6] });
      L.marker([p.lat, p.lon], { icon }).bindPopup(`<b>${p.name}</b><br/><span style="text-transform:uppercase;font-size:10px;color:${c}">${p.type}</span>${p.address ? `<br/>${p.address}` : ""}`).addTo(layer);
    });
  }

  useEffect(() => { renderFacilities(places); }, [filter, places]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const j = await r.json();
      if (!j.length) { toast.error("Place not found"); return; }
      const lat = parseFloat(j[0].lat), lon = parseFloat(j[0].lon);
      mapRef.current?.setView([lat, lon], 13);
      await fetchNearby(lat, lon);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="sentinel-card !p-3 flex flex-wrap items-center gap-2">
        <form onSubmit={search} className="flex gap-2 flex-1 min-w-[260px]">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search any city or place worldwide..." className="flex-1" />
          <Button type="submit" disabled={loading} className="bg-teal text-[#001012] hover:bg-teal/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>
        <Button variant="outline" onClick={locate} disabled={loading}>
          <Crosshair className="w-4 h-4 mr-2" />My Location
        </Button>
        <div className="flex gap-1 ml-auto">
          {(["all", "hospital", "clinic", "pharmacy"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-md font-mono uppercase tracking-wider transition ${filter === f ? "bg-teal text-[#001012]" : "bg-input text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="sentinel-card !p-0 overflow-hidden">
        <div ref={ref} className="w-full h-[560px]" />
      </div>

      <div className="sentinel-card !py-3 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2"><span className="pulse-dot" style={{ width: 10, height: 10 }} /> Your location</div>
        <div className="flex items-center gap-2"><span className="facility-dot" style={{ background: COLORS.hospital, color: COLORS.hospital, width: 10, height: 10 }} /> Hospitals</div>
        <div className="flex items-center gap-2"><span className="facility-dot" style={{ background: COLORS.clinic, color: COLORS.clinic, width: 10, height: 10 }} /> Clinics</div>
        <div className="flex items-center gap-2"><span className="facility-dot" style={{ background: COLORS.pharmacy, color: COLORS.pharmacy, width: 10, height: 10 }} /> Pharmacies</div>
        <div className="ml-auto font-mono text-muted-foreground">{places.length} facilities loaded</div>
      </div>
    </div>
  );
}
