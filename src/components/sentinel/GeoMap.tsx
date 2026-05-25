import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Place = { id: string; name: string; type: "hospital" | "clinic" | "drugstore"; lat: number; lon: number; address?: string };

export default function GeoMap() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Init map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      const map = L.map(ref.current, { zoomControl: true }).setView(center, 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Update markers
  useEffect(() => {
    (async () => {
      if (!mapRef.current) return;
      const L = (await import("leaflet")).default;
      // clear old markers
      mapRef.current.eachLayer((layer: any) => { if (layer instanceof L.CircleMarker) mapRef.current.removeLayer(layer); });
      places.forEach(p => {
        const color = p.type === "hospital" ? "#E8202A" : p.type === "clinic" ? "#00C4CC" : "#8B5CF6";
        const m = L.circleMarker([p.lat, p.lon], { radius: 8, color, fillColor: color, fillOpacity: 0.7, weight: 2 }).addTo(mapRef.current);
        m.bindPopup(`<div style="font-family:'DM Sans'"><strong>${p.name}</strong><br/><span style="color:${color};font-size:11px;text-transform:uppercase;font-family:monospace">${p.type}</span>${p.address ? `<br/><span style="font-size:11px">${p.address}</span>` : ""}</div>`);
      });
      if (places.length) mapRef.current.setView(center, 12);
    })();
  }, [places, center]);

  async function fetchPlaces(lat: number, lon: number) {
    setLoading(true);
    setCenter([lat, lon]);
    try {
      const radius = 5000;
      const q = `[out:json][timeout:25];(node["amenity"~"hospital|clinic|pharmacy"](around:${radius},${lat},${lon}););out body 80;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
      const data = await res.json();
      const mapped: Place[] = (data.elements || []).map((e: any) => ({
        id: String(e.id),
        name: e.tags?.name || `Unnamed ${e.tags?.amenity}`,
        type: e.tags?.amenity === "hospital" ? "hospital" : e.tags?.amenity === "pharmacy" ? "drugstore" : "clinic",
        lat: e.lat, lon: e.lon,
        address: [e.tags?.["addr:street"], e.tags?.["addr:city"]].filter(Boolean).join(", "),
      }));
      setPlaces(mapped);
      try { localStorage.setItem("sentinel_places_cache", JSON.stringify({ at: Date.now(), center: [lat, lon], places: mapped })); } catch {}
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchPlaces(pos.coords.latitude, pos.coords.longitude),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }

  async function searchLocation() {
    if (!query.trim()) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await res.json();
    if (data[0]) fetchPlaces(parseFloat(data[0].lat), parseFloat(data[0].lon));
  }

  return (
    <div className="space-y-4">
      <div className="sentinel-card">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Search Location</div>
            <div className="flex gap-2">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="City, address, or coordinates"
                onKeyDown={e => e.key === "Enter" && searchLocation()} className="bg-[var(--input-bg)]" />
              <Button onClick={searchLocation} className="bg-teal text-[#001012] hover:bg-teal/90"><Search className="w-4 h-4" /></Button>
            </div>
          </div>
          <Button onClick={useMyLocation} variant="outline" className="border-teal-border text-teal">
            <MapPin className="w-4 h-4 mr-2" />Use My Location
          </Button>
        </div>
      </div>

      <div className="sentinel-card p-0 overflow-hidden">
        <div ref={ref} className="w-full h-[600px]" />
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm text-teal font-mono">SCANNING SECTOR...</div>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat color="#E8202A" label="Hospitals" count={places.filter(p => p.type === "hospital").length} />
        <Stat color="#00C4CC" label="Clinics" count={places.filter(p => p.type === "clinic").length} />
        <Stat color="#8B5CF6" label="Drug Stores" count={places.filter(p => p.type === "drugstore").length} />
      </div>
    </div>
  );
}

function Stat({ color, label, count }: any) {
  return (
    <div className="sentinel-card">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
      <div className="font-mono text-3xl font-medium mt-2">{count}</div>
    </div>
  );
}
