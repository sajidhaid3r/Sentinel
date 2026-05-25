import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: IndexRouter,
});

function IndexRouter() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const uid = session.user.id;
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
      if (!role) { navigate({ to: "/onboarding/role" }); return; }
      const { data: health } = await supabase.from("health_profiles").select("id").eq("user_id", uid).maybeSingle();
      if (!health) { navigate({ to: "/onboarding/health" }); return; }
      navigate({ to: "/dashboard" });
    })();
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="font-display text-3xl text-teal animate-pulse">SENTINEL</div>
        <div className="text-muted-foreground text-sm mt-2 font-mono">INITIALIZING...</div>
      </div>
    </div>
  );
}
