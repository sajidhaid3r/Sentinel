import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Shield, Landmark, KeyRound } from "lucide-react";

export const Route = createFileRoute("/onboarding/role")({
  component: RolePage,
});

const ROLES = [
  { id: "citizen", label: "Citizen", desc: "Access personal health passport, alerts, and nearby facilities.", icon: Users, color: "text-blue", requiresCode: false },
  { id: "admin", label: "Healthcare Admin", desc: "Manage hospital load, ICU capacity, and resource demand. Invite code required.", icon: Shield, color: "text-teal", requiresCode: true },
  { id: "government", label: "Government Official", desc: "Full crisis intelligence, simulation, and policy controls. Invite code required.", icon: Landmark, color: "text-purple", requiresCode: true },
] as const;

function RolePage() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<typeof ROLES[number]["id"]>("citizen");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [session, loading, navigate]);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const role = ROLES.find(r => r.id === selected)!;
      if (role.requiresCode) {
        if (!inviteCode.trim()) throw new Error("Invite code is required for this role");
        const { error } = await supabase.rpc("claim_role_with_invite", { _code: inviteCode.trim() });
        if (error) throw error;
        await supabase.from("profiles").update({ role: selected }).eq("id", user.id);
        toast.success(`${role.label} role activated`);
      } else {
        // Citizen role auto-assigned at signup; just update profile preference
        await supabase.from("profiles").update({ role: "citizen" }).eq("id", user.id);
      }
      navigate({ to: "/onboarding/health" });
    } catch (e: any) {
      toast.error(e.message || "Failed to set role");
    } finally { setBusy(false); }
  }

  const needsCode = ROLES.find(r => r.id === selected)?.requiresCode;

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

        {needsCode && (
          <div className="sentinel-card mt-6 max-w-md mx-auto">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Invite Code</Label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                className="pl-10 bg-[var(--input-bg)] h-11 font-mono" placeholder="SENTINEL-XXXX-XXXX" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Elevated roles require authorization. Contact your agency administrator for an invite code.
            </p>
          </div>
        )}

        <div className="flex justify-center mt-8">
          <Button disabled={busy} onClick={save} className="bg-teal text-[#001012] hover:bg-teal/90 px-8 h-11">
            {busy ? "Activating..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
