import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Save, Heart, Phone } from "lucide-react";
import HealthPassport from "./HealthPassport";

export default function ProfilePanel({ health, role, onUpdated }: { health: any; role: string; onUpdated: (h: any) => void }) {
  const { user } = useAuth();
  const [h, setH] = useState(health);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("health_profiles").update({
        full_name: h.full_name,
        blood_group: h.blood_group,
        allergies: h.allergies,
        medications: h.medications,
        chronic_conditions: h.chronic_conditions,
        emergency_contact_name: h.emergency_contact_name,
        emergency_contact_phone: h.emergency_contact_phone,
        emergency_contact_relationship: h.emergency_contact_relationship,
        local_address: h.local_address,
      }).eq("user_id", user.id).select().single();
      if (error) throw error;
      onUpdated(data);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-4">
      <div className="space-y-4">
        <div className="sentinel-card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-teal" />
            <span className="font-display">Personal Information</span>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-teal px-2 py-0.5 rounded-full border border-teal-border bg-teal-dim">{role}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full Name" value={h.full_name} onChange={v => setH({ ...h, full_name: v })} />
            <Field label="Email" value={user?.email || ""} disabled />
            <Field label="Blood Group" value={h.blood_group || ""} onChange={v => setH({ ...h, blood_group: v })} />
            <Field label="Local Address" value={h.local_address || ""} onChange={v => setH({ ...h, local_address: v })} />
          </div>
        </div>

        <div className="sentinel-card">
          <div className="flex items-center gap-2 mb-4"><Heart className="w-4 h-4 text-red" /><span className="font-display">Medical</span></div>
          <div className="space-y-3">
            <TArea label="Allergies" value={h.allergies || ""} onChange={v => setH({ ...h, allergies: v })} />
            <TArea label="Current Medications" value={h.medications || ""} onChange={v => setH({ ...h, medications: v })} />
            <TArea label="Chronic Conditions" value={h.chronic_conditions || ""} onChange={v => setH({ ...h, chronic_conditions: v })} />
          </div>
        </div>

        <div className="sentinel-card">
          <div className="flex items-center gap-2 mb-4"><Phone className="w-4 h-4 text-teal" /><span className="font-display">Emergency Contact</span></div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Name" value={h.emergency_contact_name || ""} onChange={v => setH({ ...h, emergency_contact_name: v })} />
            <Field label="Relationship" value={h.emergency_contact_relationship || ""} onChange={v => setH({ ...h, emergency_contact_relationship: v })} />
            <Field label="Phone" value={h.emergency_contact_phone || ""} onChange={v => setH({ ...h, emergency_contact_phone: v })} />
          </div>
        </div>

        <Button onClick={save} disabled={busy} className="bg-teal text-[#001012] hover:bg-teal/90">
          <Save className="w-4 h-4 mr-2" />{busy ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div>
        <HealthPassport health={h} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled} className="mt-1" />
    </div>
  );
}
function TArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={e => onChange(e.target.value)} className="mt-1 min-h-[60px]" />
    </div>
  );
}
