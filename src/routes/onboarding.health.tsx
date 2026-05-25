import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/onboarding/health")({
  component: HealthOnboarding,
});

const VACCINE_PRESETS = ["COVID-19 (Pfizer)", "COVID-19 (Moderna)", "COVID-19 (Covishield)", "Influenza", "Hepatitis B", "Tetanus", "Polio", "MMR", "HPV", "Yellow Fever"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Vaccine = { name: string; date: string };

const schema = z.object({
  full_name: z.string().trim().min(1).max(120),
  date_of_birth: z.string().min(1),
  gender: z.string().min(1),
  blood_group: z.string().min(1),
  local_address: z.string().trim().max(500),
  permanent_address: z.string().trim().max(500),
  emergency_contact_name: z.string().trim().min(1).max(120),
  emergency_contact_relationship: z.string().trim().min(1).max(60),
  emergency_contact_phone: z.string().trim().min(6).max(20),
});

function HealthOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", gender: "", blood_group: "",
    local_address: "", permanent_address: "",
    medications: "", allergies: "", chronic_conditions: "",
    emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
    current_vector_exposure: "None",
  });
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [vSelect, setVSelect] = useState(""); const [vCustom, setVCustom] = useState(""); const [vDate, setVDate] = useState("");

  function addVaccine() {
    const name = vCustom.trim() || vSelect;
    if (!name || !vDate) { toast.error("Pick vaccine and date"); return; }
    setVaccines([...vaccines, { name, date: vDate }]);
    setVSelect(""); setVCustom(""); setVDate("");
  }

  async function submit() {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("health_profiles").insert({
        user_id: user.id,
        ...form,
        vaccines: vaccines as any,
      });
      if (error) throw error;
      toast.success("Health passport created");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  const set = (k: string) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="min-h-screen bg-background p-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl">Medical Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">This info is encrypted and shown to medical responders via your QR passport.</p>
        </div>

        <div className="sentinel-card space-y-5">
          <h2 className="font-display text-lg text-teal">Identity</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Full Name *"><Input value={form.full_name} onChange={e => set("full_name")(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
            <Field label="Date of Birth *"><Input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth")(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
            <Field label="Gender *">
              <Select value={form.gender} onValueChange={set("gender")}>
                <SelectTrigger className="bg-[var(--input-bg)]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Male", "Female", "Non-binary", "Prefer not to say"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Blood Group *">
              <Select value={form.blood_group} onValueChange={set("blood_group")}>
                <SelectTrigger className="bg-[var(--input-bg)]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="sentinel-card space-y-5 mt-4">
          <h2 className="font-display text-lg text-teal">Address</h2>
          <Field label="Local Address"><Textarea rows={2} value={form.local_address} onChange={e => set("local_address")(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
          <Field label="Permanent Address"><Textarea rows={2} value={form.permanent_address} onChange={e => set("permanent_address")(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
        </div>

        <div className="sentinel-card space-y-5 mt-4">
          <h2 className="font-display text-lg text-teal">Medical</h2>
          <Field label="Current Medications"><Textarea rows={2} value={form.medications} onChange={e => set("medications")(e.target.value)} className="bg-[var(--input-bg)]" placeholder="e.g. Metformin 500mg twice daily" /></Field>
          <Field label="Allergies"><Textarea rows={2} value={form.allergies} onChange={e => set("allergies")(e.target.value)} className="bg-[var(--input-bg)]" placeholder="e.g. Penicillin, peanuts" /></Field>
          <Field label="Chronic Conditions"><Textarea rows={2} value={form.chronic_conditions} onChange={e => set("chronic_conditions")(e.target.value)} className="bg-[var(--input-bg)]" placeholder="e.g. Diabetes Type 2, Asthma" /></Field>
          <Field label="Current Vector Exposure">
            <Select value={form.current_vector_exposure} onValueChange={set("current_vector_exposure")}>
              <SelectTrigger className="bg-[var(--input-bg)]"><SelectValue /></SelectTrigger>
              <SelectContent>{["None", "Possible exposure", "Confirmed contact", "Active symptoms"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="sentinel-card space-y-4 mt-4">
          <h2 className="font-display text-lg text-teal">Vaccination History</h2>
          <div className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
            <Field label="Preset">
              <Select value={vSelect} onValueChange={setVSelect}>
                <SelectTrigger className="bg-[var(--input-bg)]"><SelectValue placeholder="Choose vaccine" /></SelectTrigger>
                <SelectContent>{VACCINE_PRESETS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Or Custom"><Input value={vCustom} onChange={e => setVCustom(e.target.value)} placeholder="Custom vaccine name" className="bg-[var(--input-bg)]" /></Field>
            <Field label="Date"><Input type="date" value={vDate} onChange={e => setVDate(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
            <Button type="button" onClick={addVaccine} className="bg-teal text-[#001012] hover:bg-teal/90"><Plus className="w-4 h-4" /></Button>
          </div>
          {vaccines.length > 0 && (
            <div className="space-y-2 mt-2">
              {vaccines.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[var(--input-bg)] rounded-md">
                  <div><div className="text-sm font-medium">{v.name}</div><div className="text-xs font-mono text-muted-foreground">{v.date}</div></div>
                  <button onClick={() => setVaccines(vaccines.filter((_, j) => j !== i))}><X className="w-4 h-4 text-red" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sentinel-card space-y-5 mt-4">
          <h2 className="font-display text-lg text-teal">Emergency Contact</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name *"><Input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name")(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
            <Field label="Relationship *"><Input value={form.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship")(e.target.value)} placeholder="e.g. Spouse" className="bg-[var(--input-bg)]" /></Field>
            <Field label="Phone *"><Input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone")(e.target.value)} className="bg-[var(--input-bg)]" /></Field>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={submit} disabled={busy} className="bg-teal text-[#001012] hover:bg-teal/90 px-8 h-11">
            {busy ? "Generating Passport..." : "Generate Health Passport"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
