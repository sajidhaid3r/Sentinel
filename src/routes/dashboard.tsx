import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Activity, Map as MapIcon, Wifi, Syringe, Hospital, Brain, Users } from "lucide-react";
import HealthPassport from "@/components/sentinel/HealthPassport";
import SimulationPanel from "@/components/sentinel/SimulationPanel";
import GeoMap from "@/components/sentinel/GeoMap";
import OfflineMode from "@/components/sentinel/OfflineMode";
import HospitalLoad from "@/components/sentinel/HospitalLoad";
import VaccineDistribution from "@/components/sentinel/VaccineDistribution";
import AIOutbreak from "@/components/sentinel/AIOutbreak";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Role = "citizen" | "admin" | "government";

function Dashboard() {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [tab, setTab] = useState("passport");

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/login" }); return; }
    (async () => {
      const uid = session.user.id;
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
      if (!r) { navigate({ to: "/onboarding/role" }); return; }
      setRole(r.role as Role);
      const { data: h } = await supabase.from("health_profiles").select("*").eq("user_id", uid).maybeSingle();
      if (!h) { navigate({ to: "/onboarding/health" }); return; }
      setHealth(h);
    })();
  }, [session, loading, navigate]);

  if (!role || !health) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-teal font-mono animate-pulse">LOADING SENTINEL...</div></div>;
  }

  // tabs based on role
  const citizenTabs = [
    { id: "passport", label: "Health Passport", icon: Shield },
    { id: "map", label: "Geospatial Map", icon: MapIcon },
    { id: "offline", label: "Offline Mode", icon: Wifi },
  ];
  const adminTabs = [
    ...citizenTabs,
    { id: "hospital", label: "Hospital Load", icon: Hospital },
    { id: "vaccine", label: "Vaccine Dist.", icon: Syringe },
  ];
  const govTabs = [
    ...adminTabs,
    { id: "sim", label: "Pandemic Simulation", icon: Activity },
    { id: "ai", label: "AI Outbreak Forecast", icon: Brain },
  ];
  const tabs = role === "citizen" ? citizenTabs : role === "admin" ? adminTabs : govTabs;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[var(--surface)] sticky top-0 z-50 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal/10 border border-teal-border flex items-center justify-center">
              <Shield className="w-5 h-5 text-teal" />
            </div>
            <div>
              <div className="font-display text-lg leading-none">SENTINEL</div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{role.toUpperCase()} CONSOLE</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-mild/10 border border-mild/30">
              <div className="w-2 h-2 rounded-full bg-mild animate-pulse" />
              <span className="text-xs font-mono text-mild">SYSTEM NOMINAL</span>
            </div>
            <div className="text-sm text-muted-foreground hidden sm:block">{user?.email}</div>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-[var(--surface)] border border-border h-auto p-1 flex-wrap justify-start">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id} className="data-[state=active]:bg-teal data-[state=active]:text-[#001012] gap-2 px-4 py-2">
                  <Icon className="w-4 h-4" />{t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="passport" className="mt-6"><HealthPassport health={health} /></TabsContent>
          <TabsContent value="map" className="mt-6"><GeoMap /></TabsContent>
          <TabsContent value="offline" className="mt-6"><OfflineMode /></TabsContent>
          {(role === "admin" || role === "government") && <>
            <TabsContent value="hospital" className="mt-6"><HospitalLoad /></TabsContent>
            <TabsContent value="vaccine" className="mt-6"><VaccineDistribution /></TabsContent>
          </>}
          {role === "government" && <>
            <TabsContent value="sim" className="mt-6"><SimulationPanel /></TabsContent>
            <TabsContent value="ai" className="mt-6"><AIOutbreak /></TabsContent>
          </>}
        </Tabs>
      </main>
    </div>
  );
}
