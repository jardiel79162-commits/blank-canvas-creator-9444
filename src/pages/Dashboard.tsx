import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import RemixForm from "@/components/RemixForm";
import RemixHistory from "@/components/RemixHistory";
import LowCreditAlert from "@/components/LowCreditAlert";
import SpaceParticles from "@/components/SpaceParticles";
import spaceBg from "@/assets/space-bg.jpg";

export default function Dashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [credits, setCredits] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", user.id)
      .single();
    setCredits(data?.credits ?? 0);
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits, refreshKey]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Space background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${spaceBg})` }}
      />
      <div className="fixed inset-0 z-0 bg-background/40" />
      <SpaceParticles />

      <div className="relative z-10 flex flex-col min-h-screen">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} credits={credits} />
        <AppHeader credits={credits} onMenuOpen={() => setSidebarOpen(true)} />
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
          <LowCreditAlert credits={credits} />
          <RemixForm
            credits={credits}
            onRemixComplete={() => {
              setRefreshKey((k) => k + 1);
              fetchCredits();
            }}
          />
          <RemixHistory refreshKey={refreshKey} />
        </main>
      </div>
    </div>
  );
}
