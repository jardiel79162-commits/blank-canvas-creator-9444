import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CpfStep from "@/components/payment/CpfStep";
import QrCodeStep from "@/components/payment/QrCodeStep";
import SuccessStep from "@/components/payment/SuccessStep";

type Step = "cpf" | "qrcode" | "success";

interface PaymentFlowProps {
  quantity: number;
  onClose: () => void;
  onPaymentComplete: () => void;
}

export default function PaymentFlow({ quantity, onClose, onPaymentComplete }: PaymentFlowProps) {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("cpf");
  const [loading, setLoading] = useState(false);
  const [savedCpf, setSavedCpf] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const unitPrice = 0.5;
  const total = (quantity * unitPrice).toFixed(2);

  // Load saved CPF
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("cpf")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.cpf) setSavedCpf(data.cpf);
      });
  }, [user]);

  // Auto-skip CPF step if saved
  useEffect(() => {
    if (savedCpf && step === "cpf") {
      // Don't auto-skip, let user see saved CPF and confirm
    }
  }, [savedCpf, step]);

  // Poll for payment status
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
          onPaymentComplete();
        }
      } catch {
        // silently retry
      }
    }, 5000);
  }, [session, onPaymentComplete]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4">
        {step === "cpf" && (
          <CpfStep
            savedCpf={savedCpf}
            quantity={quantity}
            total={total}
            loading={loading}
            onSubmit={handleCpfSubmit}
            onCancel={onClose}
          />
        )}
        {step === "qrcode" && (
          <QrCodeStep
            qrCode={qrCode}
            qrCodeBase64={qrCodeBase64}
            quantity={quantity}
            total={total}
            onCancel={onClose}
          />
        )}
        {step === "success" && (
          <SuccessStep quantity={quantity} onGoHome={onClose} />
        )}
      </div>
    </div>
  );
}
