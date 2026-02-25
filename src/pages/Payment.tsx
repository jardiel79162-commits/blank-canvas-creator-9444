import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CpfStep from "@/components/payment/CpfStep";
import QrCodeStep from "@/components/payment/QrCodeStep";
import SuccessStep from "@/components/payment/SuccessStep";
import spaceBg from "@/assets/space-bg.jpg";

type Step = "cpf" | "qrcode" | "success";

export default function Payment() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const quantity = parseInt(searchParams.get("qty") || "10", 10);

  const [step, setStep] = useState<Step>("cpf");
  const [loading, setLoading] = useState(false);
  const [savedCpf, setSavedCpf] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const unitPrice = 0.5;
  const total = (quantity * unitPrice).toFixed(2);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("cpf")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if ((data as any)?.cpf) setSavedCpf((data as any).cpf);
      });
  }, [user]);

  const startPolling = useCallback((pId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/mercadopago-payment?action=check-status&payment_id=${pId}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              apikey: supabaseKey,
            },
          }
        );
        const data = await res.json();
        if (data.status === "approved") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
        }
      } catch {
        // silently retry
      }
    }, 5000);
  }, [session]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCpfSubmit = async (cpf: string, saveCpf: boolean) => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/mercadopago-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ credits: quantity, cpf, save_cpf: saveCpf }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar pagamento");
      }

      const data = await res.json();
      setQrCode(data.qr_code);
      setQrCodeBase64(data.qr_code_base64);
      setPaymentId(data.payment_id);
      setStep("qrcode");
      startPolling(data.payment_id);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => navigate("/store");

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${spaceBg})` }} />
      <div className="fixed inset-0 z-0 bg-background/40" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {step !== "success" && (
          <header className="border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/store")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-foreground">Pagamento</span>
            </div>
          </header>
        )}

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {step === "cpf" && (
              <CpfStep
                savedCpf={savedCpf}
                quantity={quantity}
                total={total}
                loading={loading}
                onSubmit={handleCpfSubmit}
                onCancel={() => navigate("/store")}
              />
            )}
            {step === "qrcode" && (
              <QrCodeStep
                qrCode={qrCode}
                qrCodeBase64={qrCodeBase64}
                quantity={quantity}
                total={total}
                onCancel={() => navigate("/store")}
              />
            )}
            {step === "success" && (
              <SuccessStep quantity={quantity} onGoHome={handleGoHome} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
