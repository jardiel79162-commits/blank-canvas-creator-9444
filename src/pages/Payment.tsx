import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Coins, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import CpfStep from "@/components/payment/CpfStep";
import QrCodeStep from "@/components/payment/QrCodeStep";
import SuccessStep from "@/components/payment/SuccessStep";
import spaceBg from "@/assets/space-bg.jpg";

type Step = "cpf" | "qrcode" | "success";

const STEP_LABELS: Record<Step, string> = {
  cpf: "Identificação",
  qrcode: "Pagamento",
  success: "Confirmado",
};

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ["cpf", "qrcode", "success"];
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-8 h-px transition-colors duration-500 ${isDone ? "bg-primary" : "bg-border"}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-500 ${
                  isActive
                    ? "gradient-primary text-primary-foreground scale-110 glow-primary"
                    : isDone
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-primary" : isDone ? "text-primary/60" : "text-muted-foreground/50"}`}>
                {STEP_LABELS[s]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${spaceBg})` }} />
      <div className="fixed inset-0 z-0 bg-background/50 backdrop-blur-[2px]" />

      {/* Ambient glow orbs */}
      <div className="fixed top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/8 blur-[100px] animate-pulse-glow z-0" />
      <div className="fixed bottom-1/4 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px] animate-pulse-glow z-0" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        {step !== "success" && (
          <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => navigate("/store")}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-foreground text-sm">Checkout</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                <Lock className="w-3 h-3" />
                <span>Conexão segura</span>
              </div>
            </div>
          </header>
        )}

        {/* Step indicator */}
        <div className="max-w-lg mx-auto w-full px-4">
          <StepIndicator current={step} />
        </div>

        {/* Main content */}
        <main className="flex-1 flex items-start justify-center p-4 pt-2">
          <div className="w-full max-w-md animate-fade-in" key={step}>
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

        {/* Footer */}
        <footer className="py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
            <ShieldCheck className="w-3 h-3" />
            <span>Pagamento processado via Mercado Pago</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
