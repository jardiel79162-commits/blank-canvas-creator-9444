import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import AppFooter from "@/components/AppFooter";
import CreditStore from "@/components/CreditStore";
import spaceBg from "@/assets/space-bg.jpg";

export default function Store() {
  const { user } = useAuth();
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
  }, [fetchCredits]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${spaceBg})` }} />
      <div className="fixed inset-0 z-0 bg-background/40" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} credits={credits} />
        <AppHeader credits={credits} onMenuOpen={() => setSidebarOpen(true)} />
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Loja de Créditos</h1>
            <p className="text-sm text-muted-foreground">
              Adquira créditos para utilizar nos seus remixes.
            </p>
          </div>
          <CreditStore credits={credits} onPurchaseComplete={fetchCredits} />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
