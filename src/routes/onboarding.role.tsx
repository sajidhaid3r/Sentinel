import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Shield, Landmark } from "lucide-react";

export const Route = createFileRoute("/onboarding/role")({
  component: RolePage,
});

const ROLES = [
  { id: "citizen", label: "Citizen", desc: "Access personal health passport, alerts, and nearby facilities.", icon: Users, color: "text-blue" },
  { id: "admin", label: "Healthcare Admin", desc: "Manage hospital load, ICU capacity, and resource demand.", icon: Shield, color: "text-teal" },
  { id: "government", label: "Government Official", desc: "Full crisis intelligence, simulation, and policy controls.", icon: Landmark, color: "text-purple" },
] as const;

function RolePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<typeof ROLES[number]["id"] | null>(null);

  async function save() {
    if (!user || !selected) return;
    setBusy(true);
    try {
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: user.id, role: selected });
      if (roleErr) throw roleErr;
      await supabase.from("profiles").update({ role: selected }).eq("id", user.id);
      toast.success("Role assigned");
      navigate({ to: "/onboarding/health" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl">Select Your Access Role</h1>
          <p className="text-muted-foreground text-sm mt-2">This determines which SENTINEL modules you can access.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isSel = selected === r.id;
            return (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`sentinel-card text-left ${isSel ? "border-teal glow-teal" : ""}`}>
                <Icon className={`w-8 h-8 ${r.color} mb-3`} />
                <div className="font-display text-lg">{r.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{r.desc}</div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-center mt-8">
          <Button disabled={!selected || busy} onClick={save} className="bg-teal text-[#001012] hover:bg-teal/90 px-8 h-11">
            {busy ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
