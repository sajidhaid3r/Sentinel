import { QRCodeSVG } from "qrcode.react";
import { Shield, Calendar, Droplet, MapPin, AlertTriangle, Syringe } from "lucide-react";

export default function HealthPassport({ health }: { health: any }) {
  const payload = {
    type: "SENTINEL_PASSPORT",
    name: health.full_name,
    dob: health.date_of_birth,
    blood: health.blood_group,
    allergies: health.allergies,
    vaccines: health.vaccines,
    exposure: health.current_vector_exposure,
    emergency: `${health.emergency_contact_name} (${health.emergency_contact_relationship}) ${health.emergency_contact_phone}`,
  };
  const qr = JSON.stringify(payload);

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <div className="sentinel-card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs font-mono text-muted-foreground tracking-widest">IMMUNITY PASSPORT</div>
            <h1 className="font-display text-3xl mt-1">{health.full_name}</h1>
            <div className="text-sm text-muted-foreground font-mono mt-1">ID: SNTL-{health.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-teal-dim border border-teal-border">
            <div className="text-[10px] font-mono text-teal tracking-widest">VERIFIED</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Info icon={Calendar} label="Date of Birth" value={health.date_of_birth} />
          <Info icon={Droplet} label="Blood Group" value={health.blood_group} highlight />
          <Info icon={MapPin} label="Local Address" value={health.local_address || "—"} />
          <Info icon={MapPin} label="Permanent Address" value={health.permanent_address || "—"} />
          <Info icon={AlertTriangle} label="Allergies" value={health.allergies || "None reported"} />
          <Info icon={AlertTriangle} label="Current Vector Exposure" value={health.current_vector_exposure} />
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-3"><Syringe className="w-4 h-4 text-teal" /><div className="text-xs font-mono tracking-widest text-muted-foreground">VACCINATION RECORD</div></div>
          {Array.isArray(health.vaccines) && health.vaccines.length > 0 ? (
            <div className="space-y-2">
              {health.vaccines.map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[var(--input-bg)] rounded-md">
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="font-mono text-xs text-teal">{v.date}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-muted-foreground">No vaccines recorded</div>}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-xs font-mono tracking-widest text-muted-foreground mb-2">EMERGENCY CONTACT</div>
          <div className="text-sm">{health.emergency_contact_name} <span className="text-muted-foreground">({health.emergency_contact_relationship})</span></div>
          <div className="font-mono text-sm text-teal">{health.emergency_contact_phone}</div>
        </div>
      </div>

      <div className="sentinel-card flex flex-col items-center justify-center text-center">
        <Shield className="w-6 h-6 text-teal mb-3" />
        <div className="text-xs font-mono text-muted-foreground tracking-widest mb-4">SCAN FOR EMERGENCY ACCESS</div>
        <div className="p-4 bg-white rounded-lg">
          <QRCodeSVG value={qr} size={240} level="M" />
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-4 tracking-wider">SENTINEL · ENCRYPTED</div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className="p-3 bg-[var(--input-bg)] rounded-md">
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground tracking-widest"><Icon className="w-3 h-3" />{label.toUpperCase()}</div>
      <div className={`mt-1 ${highlight ? "text-teal font-mono text-lg font-medium" : "text-sm"}`}>{value}</div>
    </div>
  );
}
