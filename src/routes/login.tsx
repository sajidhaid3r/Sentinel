import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Activity, Shield, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox to verify.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      }
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (r.error) throw r.error;
      if (!r.redirected) navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message || "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle at 20% 30%, rgba(0,196,204,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(232,32,42,0.1), transparent 50%)" }} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-teal/10 border border-teal-border flex items-center justify-center glow-teal">
                <Shield className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h1 className="font-display text-3xl text-foreground tracking-tight">SENTINEL</h1>
                <div className="text-[10px] font-mono text-muted-foreground tracking-widest">PANDEMIC INTELLIGENCE v1.0</div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mt-4">National Pandemic Simulation & Healthcare Crisis Intelligence Platform</p>
          </div>

          <div className="sentinel-card">
            <div className="flex gap-2 mb-6 p-1 bg-[var(--input-bg)] rounded-lg">
              <button onClick={() => setMode("signin")}
                className={`flex-1 py-2 text-sm rounded-md transition ${mode === "signin" ? "bg-teal text-[#001012] font-medium" : "text-muted-foreground"}`}>
                Sign In
              </button>
              <button onClick={() => setMode("signup")}
                className={`flex-1 py-2 text-sm rounded-md transition ${mode === "signup" ? "bg-teal text-[#001012] font-medium" : "text-muted-foreground"}`}>
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Operator Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-[var(--input-bg)] border-border h-11" placeholder="operator@agency.gov" />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Secure Passphrase</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-[var(--input-bg)] border-border h-11" placeholder="••••••••" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 bg-teal hover:bg-teal/90 text-[#001012] font-semibold">
                {busy ? "Authenticating..." : mode === "signin" ? "Authenticate" : "Create Operator Account"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[var(--card-bg)] px-3 text-muted-foreground uppercase tracking-wider">or continue with</span></div>
            </div>

            <button type="button" onClick={googleSignIn} disabled={busy}
              className="w-full h-11 rounded-md border border-border bg-[var(--input-bg)] hover:bg-[var(--card-hover)] flex items-center justify-center gap-3 text-sm font-medium transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p className="text-[11px] text-muted-foreground text-center mt-5 font-mono">
              Authorized personnel only. All sessions are logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
