import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wifi, WifiOff, Hospital, Cross, Pill, MapPin, Phone, MessageSquare,
  Download, Printer, Share2, Bluetooth, Radio, Signal, SignalZero,
  Ambulance, Flame, ShieldAlert, Baby, Heart, Zap, RefreshCw, Save,
  Copy, Check, Smartphone, BatteryLow,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Place = { id: string; name: string; type: string; lat: number; lon: number; address?: string; phone?: string };
type Cache = { at: number; center: [number, number]; places: Place[]; region?: string };

// Global emergency shortcodes — work on ANY cellular network, even with no data / roaming / expired SIM.
// tel: URIs on emergency numbers work even without a SIM on most modern phones.
const EMERGENCY = [
  { code: "112", label: "Universal Emergency", desc: "Works in EU, India, most of world — police/fire/medical", icon: ShieldAlert, color: "#E8202A" },
  { code: "911", label: "North America", desc: "USA, Canada, Mexico emergency line", icon: ShieldAlert, color: "#E8202A" },
  { code: "108", label: "Ambulance (India)", desc: "Free 24/7 ambulance dispatch", icon: Ambulance, color: "#00C4CC" },
  { code: "102", label: "Maternal / Newborn", desc: "Pregnancy, delivery, infant care", icon: Baby, color: "#FF8C42" },
  { code: "1075", label: "Pandemic Helpline (India)", desc: "National disease control helpline", icon: Heart, color: "#8B5CF6" },
  { code: "101", label: "Fire", desc: "Fire brigade dispatch", icon: Flame, color: "#FF6B35" },
  { code: "100", label: "Police", desc: "Local law enforcement", icon: ShieldAlert, color: "#4F46E5" },
  { code: "1097", label: "AIDS / STI Helpline", desc: "Confidential health counselling", icon: Heart, color: "#EC4899" },
];

const SMS_TEMPLATES = [
  { to: "112", body: "EMERGENCY: Need medical help. Location: {LOC}. Name: {NAME}. Blood: {BLOOD}.", label: "Send SOS SMS" },
  { to: "108", body: "AMBULANCE needed at {LOC}. Patient: {NAME}, {AGE}yr, Blood {BLOOD}. Condition: [describe].", label: "Request Ambulance" },
];

export default function OfflineMode() {
  const { user } = useAuth();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [conn, setConn] = useState<string>("unknown");
  const [cache, setCache] = useState<Cache | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  const [installReady, setInstallReady] = useState<any>(null);
  const [copied, setCopied] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // Load cache + health profile
  useEffect(() => {
    try { const c = localStorage.getItem("sentinel_places_cache"); if (c) { const p = JSON.parse(c); setCache(p); setLastSync(new Date(p.at).toLocaleString()); } } catch {}
    try { const h = localStorage.getItem("sentinel_health_cache"); if (h) setHealth(JSON.parse(h)); } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("health_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setHealth(data); try { localStorage.setItem("sentinel_health_cache", JSON.stringify(data)); } catch {} }
    });
  }, [user]);

  // Connection status
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const nav: any = navigator;
    const c = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (c) {
      const update = () => setConn(`${c.effectiveType || "unknown"}${c.saveData ? " • saver" : ""}`);
      update();
      c.addEventListener?.("change", update);
      return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); c.removeEventListener?.("change", update); };
    }
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setInstallReady(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  async function install() {
    if (!installReady) { toast.info("On iPhone: Share → Add to Home Screen. On Android Chrome: menu → Install app."); return; }
    installReady.prompt();
    const res = await installReady.userChoice;
    if (res.outcome === "accepted") { toast.success("SENTINEL installed — works fully offline now."); setInstallReady(null); }
  }

  async function syncNow(lat?: number, lon?: number) {
    if (!navigator.onLine) { toast.error("You're offline. Reconnect to sync."); return; }
    setLoading(true);
    try {
      let la = lat, lo = lon, region = "";
      if (la == null || lo == null) {
        if (query.trim()) {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
          const d = await r.json();
          if (d[0]) { la = parseFloat(d[0].lat); lo = parseFloat(d[0].lon); region = d[0].display_name; }
        }
      }
      if (la == null || lo == null) { toast.error("Provide a location or use GPS"); setLoading(false); return; }
      const q = `[out:json][timeout:25];(node["amenity"~"hospital|clinic|pharmacy|doctors"](around:6000,${la},${lo}););out body 120;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
      const data = await res.json();
      const places: Place[] = (data.elements || []).map((e: any) => ({
        id: String(e.id),
        name: e.tags?.name || `Unnamed ${e.tags?.amenity}`,
        type: e.tags?.amenity === "hospital" ? "hospital" : e.tags?.amenity === "pharmacy" ? "drugstore" : "clinic",
        lat: e.lat, lon: e.lon,
        address: [e.tags?.["addr:street"], e.tags?.["addr:city"], e.tags?.["addr:postcode"]].filter(Boolean).join(", "),
        phone: e.tags?.phone || e.tags?.["contact:phone"] || undefined,
      }));
      const payload: Cache = { at: Date.now(), center: [la, lo], places, region };
      localStorage.setItem("sentinel_places_cache", JSON.stringify(payload));
      setCache(payload);
      setLastSync(new Date(payload.at).toLocaleString());
      toast.success(`Cached ${places.length} facilities. Available offline.`);
    } catch {
      toast.error("Sync failed — try again");
    } finally { setLoading(false); }
  }

  function useGeo() {
    if (!navigator.geolocation) { toast.error("GPS unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      p => syncNow(p.coords.latitude, p.coords.longitude),
      () => toast.error("Location permission denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(""), 1200); });
  }

  const grouped = useMemo(() => ({
    hospital: cache?.places.filter(p => p.type === "hospital") || [],
    clinic: cache?.places.filter(p => p.type === "clinic") || [],
    drugstore: cache?.places.filter(p => p.type === "drugstore") || [],
  }), [cache]);

  const passportPayload = health ? JSON.stringify({
    t: "SENTINEL",
    n: health.full_name,
    b: health.blood_group,
    dob: health.date_of_birth,
    al: health.allergies,
    md: health.medications,
    ec: `${health.emergency_contact_name || ""} ${health.emergency_contact_phone || ""}`.trim(),
  }) : "";

  const smsFill = (body: string) => body
    .replace("{NAME}", health?.full_name || "Unknown")
    .replace("{BLOOD}", health?.blood_group || "?")
    .replace("{AGE}", health?.date_of_birth ? String(new Date().getFullYear() - new Date(health.date_of_birth).getFullYear()) : "?")
    .replace("{LOC}", cache?.region || "Unknown location");

  function printCard() {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>SENTINEL Emergency Card</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#000;background:#fff}
        .card{border:2px solid #000;border-radius:12px;padding:20px;max-width:520px;margin:auto}
        .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #999;font-size:14px}
        h1{margin:0 0 4px;font-size:22px;letter-spacing:2px}
        .sub{color:#666;font-size:11px;letter-spacing:3px;margin-bottom:16px}
        .em{background:#000;color:#fff;padding:8px 12px;border-radius:6px;margin-top:12px;font-size:13px}
        .em b{display:block;font-size:20px;letter-spacing:2px}
        .footer{margin-top:16px;font-size:10px;color:#666;text-align:center}
      </style></head><body><div class="card">
      <h1>SENTINEL</h1><div class="sub">EMERGENCY MEDICAL CARD · KEEP IN WALLET</div>
      <div class="row"><b>Name</b><span>${health?.full_name || "—"}</span></div>
      <div class="row"><b>Blood Group</b><span style="font-size:20px;font-weight:700">${health?.blood_group || "—"}</span></div>
      <div class="row"><b>DOB</b><span>${health?.date_of_birth || "—"}</span></div>
      <div class="row"><b>Allergies</b><span>${health?.allergies || "None"}</span></div>
      <div class="row"><b>Medications</b><span>${health?.medications || "None"}</span></div>
      <div class="row"><b>Chronic</b><span>${health?.chronic_conditions || "None"}</span></div>
      <div class="row"><b>Emergency Contact</b><span>${health?.emergency_contact_name || "—"} · ${health?.emergency_contact_phone || "—"}</span></div>
      <div class="em"><b>CALL 112</b>Universal emergency · works with no SIM / no signal bars</div>
      <div class="footer">Show this card to any first responder. Valid without network.</div>
      </div><script>window.print();</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className={`sentinel-card ${online ? "border-mild/30" : "border-red/40 bg-red-dim/30"}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${online ? "bg-mild/10 border border-mild/30" : "bg-red/20 border border-red/40"}`}>
              {online ? <Wifi className="w-5 h-5 text-mild" /> : <WifiOff className="w-5 h-5 text-red" />}
            </div>
            <div>
              <div className="font-display text-lg leading-tight">{online ? "Online — Live Sync" : "OFFLINE MODE ACTIVE"}</div>
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-2 mt-0.5">
                <Signal className="w-3 h-3" /> {conn}
                <span className="opacity-40">·</span>
                {lastSync ? `Synced ${lastSync}` : "No cache yet"}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {online && <>
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="City / area to cache"
                className="bg-[var(--input-bg)] w-48" />
              <Button onClick={() => syncNow()} disabled={loading} className="bg-teal text-[#001012] hover:bg-teal/90">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {loading ? "" : "Cache"}
              </Button>
              <Button onClick={useGeo} variant="outline" className="border-teal-border text-teal"><MapPin className="w-4 h-4" /></Button>
            </>}
            <Button onClick={install} variant="outline" className="border-teal-border text-teal">
              <Smartphone className="w-4 h-4 mr-2" />Install App
            </Button>
          </div>
        </div>
      </div>

      {/* No-Signal Explainer */}
      {!online && (
        <div className="sentinel-card bg-red-dim/20 border-red/40">
          <div className="flex gap-3">
            <SignalZero className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-red">No Data Connection Detected.</strong> All cached facilities, emergency numbers, and your health passport are still available below. Emergency numbers (112 / 911 / 108) work over voice-only cell signal — even with no data or roaming block. If your phone shows any signal bars, tap-to-call still works.
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="lifeline">
        <TabsList className="bg-[var(--surface)] border border-border">
          <TabsTrigger value="lifeline" className="gap-2"><Zap className="w-4 h-4" />Lifeline</TabsTrigger>
          <TabsTrigger value="facilities" className="gap-2"><Hospital className="w-4 h-4" />Cached Facilities</TabsTrigger>
          <TabsTrigger value="card" className="gap-2"><Heart className="w-4 h-4" />Emergency Card</TabsTrigger>
          <TabsTrigger value="nosignal" className="gap-2"><Radio className="w-4 h-4" />No-Signal Guide</TabsTrigger>
        </TabsList>

        {/* LIFELINE — tap-to-call emergency grid */}
        <TabsContent value="lifeline" className="mt-4 space-y-4">
          <div className="sentinel-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-lg">Emergency Dial</div>
                <div className="text-xs text-muted-foreground">Tap any number to call. Works over cellular voice even with zero data.</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {EMERGENCY.map(e => {
                const Icon = e.icon;
                return (
                  <a key={e.code} href={`tel:${e.code}`} className="group p-4 rounded-lg border border-border bg-[var(--input-bg)] hover:border-teal transition flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${e.color}20`, border: `1px solid ${e.color}50` }}>
                      <Icon className="w-5 h-5" style={{ color: e.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-2xl font-bold leading-none" style={{ color: e.color }}>{e.code}</div>
                      <div className="text-sm font-medium mt-1">{e.label}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{e.desc}</div>
                    </div>
                    <Phone className="w-4 h-4 text-muted-foreground group-hover:text-teal transition flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="sentinel-card">
            <div className="font-display text-lg mb-1">SMS Fallback</div>
            <div className="text-xs text-muted-foreground mb-3">SMS goes through on weaker signal than voice or data. Pre-filled with your health passport.</div>
            <div className="space-y-2">
              {SMS_TEMPLATES.map(s => {
                const body = smsFill(s.body);
                return (
                  <div key={s.to} className="p-3 rounded-lg bg-[var(--input-bg)] border border-border flex items-center gap-3 flex-wrap">
                    <MessageSquare className="w-4 h-4 text-teal flex-shrink-0" />
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-sm font-medium">{s.label} → {s.to}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{body}</div>
                    </div>
                    <Button size="sm" onClick={() => copy(body, s.to)} variant="outline">
                      {copied === s.to ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <a href={`sms:${s.to}?body=${encodeURIComponent(body)}`}>
                      <Button size="sm" className="bg-teal text-[#001012] hover:bg-teal/90">Send</Button>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {health?.emergency_contact_phone && (
            <div className="sentinel-card bg-teal-dim/20 border-teal-border">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs font-mono text-teal tracking-widest">YOUR EMERGENCY CONTACT</div>
                  <div className="font-display text-lg">{health.emergency_contact_name} <span className="text-xs text-muted-foreground">({health.emergency_contact_relationship})</span></div>
                  <div className="font-mono text-sm text-muted-foreground">{health.emergency_contact_phone}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${health.emergency_contact_phone}`}><Button className="bg-teal text-[#001012] hover:bg-teal/90"><Phone className="w-4 h-4 mr-2" />Call</Button></a>
                  <a href={`sms:${health.emergency_contact_phone}?body=${encodeURIComponent(`SOS — I need help. This is ${health.full_name}. Sent from SENTINEL.`)}`}>
                    <Button variant="outline"><MessageSquare className="w-4 h-4 mr-2" />SMS</Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* CACHED FACILITIES */}
        <TabsContent value="facilities" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <FacilityGroup icon={Hospital} color="#E8202A" title="Hospitals" items={grouped.hospital} />
            <FacilityGroup icon={Cross} color="#00C4CC" title="Clinics" items={grouped.clinic} />
            <FacilityGroup icon={Pill} color="#8B5CF6" title="Pharmacies" items={grouped.drugstore} />
          </div>
        </TabsContent>

        {/* EMERGENCY CARD */}
        <TabsContent value="card" className="mt-4">
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div ref={printRef} className="sentinel-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-mono text-teal tracking-widest">EMERGENCY MEDICAL CARD</div>
                  <div className="font-display text-2xl mt-1">{health?.full_name || "—"}</div>
                  <div className="text-xs font-mono text-muted-foreground">Show to any responder · valid offline</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-muted-foreground">BLOOD</div>
                  <div className="font-display text-3xl text-red">{health?.blood_group || "—"}</div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Field label="Date of Birth" value={health?.date_of_birth} />
                <Field label="Gender" value={health?.gender} />
                <Field label="Allergies" value={health?.allergies} danger />
                <Field label="Medications" value={health?.medications} />
                <Field label="Chronic Conditions" value={health?.chronic_conditions} danger />
                <Field label="Local Address" value={health?.local_address} />
                <Field label="Emergency Contact" value={`${health?.emergency_contact_name || ""} — ${health?.emergency_contact_phone || ""}`} />
                <Field label="Relationship" value={health?.emergency_contact_relationship} />
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button onClick={printCard} className="bg-teal text-[#001012] hover:bg-teal/90"><Printer className="w-4 h-4 mr-2" />Print Wallet Card</Button>
                <Button onClick={() => copy(passportPayload, "pass")} variant="outline">
                  {copied === "pass" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}Copy Passport
                </Button>
                {typeof navigator !== "undefined" && (navigator as any).share && (
                  <Button onClick={() => (navigator as any).share({ title: "SENTINEL Passport", text: passportPayload })} variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />Share
                  </Button>
                )}
              </div>
            </div>

            <div className="sentinel-card flex flex-col items-center justify-center text-center">
              <div className="text-xs font-mono text-muted-foreground tracking-widest mb-3">SCAN FOR PASSPORT</div>
              <div className="p-3 bg-white rounded-lg">
                {passportPayload
                  ? <QRCodeSVG value={passportPayload} size={180} level="M" />
                  : <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-black">No passport yet</div>}
              </div>
              <div className="text-[11px] text-muted-foreground mt-3 max-w-[220px]">Any camera app decodes this. Show to paramedics if you cannot speak.</div>
            </div>
          </div>
        </TabsContent>

        {/* NO-SIGNAL GUIDE */}
        <TabsContent value="nosignal" className="mt-4 space-y-3">
          <div className="sentinel-card">
            <div className="font-display text-lg mb-3 flex items-center gap-2"><Radio className="w-5 h-5 text-teal" />When Your Phone Has No Signal</div>
            <div className="space-y-3 text-sm">
              <Tip n="1" title="Try emergency numbers anyway" body="112 / 911 / 108 route through ANY carrier tower in range — even if your SIM has no signal on its own network. Modern phones dial these without a SIM." icon={Phone} />
              <Tip n="2" title="Move to higher ground or a window" body="Even 1 bar is enough to send SMS. Text goes through when calls don't — SMS retries automatically for hours." icon={Signal} />
              <Tip n="3" title="Turn on Wi-Fi Calling" body="If Wi-Fi is available (café, home router, public hotspot), your phone routes calls over Wi-Fi. Enable it in phone Settings → Cellular / Mobile." icon={Wifi} />
              <Tip n="4" title="Use Bluetooth mesh or nearby-share" body="Send your health passport to a nearby stranger's phone via AirDrop (iOS), Nearby Share / Quick Share (Android). They can relay it once they reach signal." icon={Bluetooth} />
              <Tip n="5" title="Show the printed emergency card" body="Print the wallet card in the previous tab. First responders read blood group, allergies, and contact info without any device." icon={Printer} />
              <Tip n="6" title="Install SENTINEL as an app" body="Tap Install App above. Once installed, the app opens fully offline — cached facilities, dial pad, passport QR all work with airplane mode." icon={Smartphone} />
              <Tip n="7" title="Preserve battery" body="Enable Low-Power Mode. Disable animations and background sync. In an outage, your phone may be the only working comms for days." icon={BatteryLow} />
            </div>
          </div>

          <div className="sentinel-card bg-moderate/10 border-moderate/30">
            <div className="text-xs font-mono text-moderate tracking-widest mb-2">SATELLITE SOS (iPhone 14+ / Pixel 9)</div>
            <div className="text-sm">If you're outside cellular coverage entirely, hold the side button + volume down until "Emergency SOS via Satellite" appears. Point at open sky. Works with zero cell towers.</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, danger }: { label: string; value?: string; danger?: boolean }) {
  return (
    <div className="p-2.5 rounded-md bg-[var(--input-bg)] border border-border">
      <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{label.toUpperCase()}</div>
      <div className={`text-sm mt-0.5 ${danger && value ? "text-red" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function Tip({ n, title, body, icon: Icon }: any) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[var(--input-bg)] border border-border">
      <div className="w-8 h-8 rounded-md bg-teal/10 border border-teal-border flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-teal" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{n}. {title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</div>
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
      <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
        {items.length === 0 ? <div className="text-xs text-muted-foreground py-4 text-center">No facilities cached. Sync while online.</div> :
          items.map((p: Place) => (
            <div key={p.id} className="p-3 bg-[var(--input-bg)] rounded-md border border-border/50 hover:border-teal/50 transition">
              <div className="text-sm font-medium">{p.name}</div>
              {p.address && <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{p.address}</div>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="text-[11px] font-mono px-2 py-1 rounded bg-teal/10 border border-teal-border text-teal hover:bg-teal hover:text-[#001012] transition flex items-center gap-1">
                    <Phone className="w-3 h-3" />{p.phone}
                  </a>
                )}
                <a href={`geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}(${encodeURIComponent(p.name)})`} className="text-[11px] font-mono px-2 py-1 rounded bg-input border border-border hover:border-teal transition flex items-center gap-1">
                  <MapPin className="w-3 h-3" />Navigate
                </a>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
