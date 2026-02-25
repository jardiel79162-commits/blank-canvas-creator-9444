import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Receipt, CheckCircle2, Clock, XCircle, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppFooter from "@/components/AppFooter";
import QrCodeStep from "@/components/payment/QrCodeStep";
import SuccessStep from "@/components/payment/SuccessStep";
import spaceBg from "@/assets/space-bg.jpg";

interface Payment {
  id: string;
  amount_cents: number;
  credits_purchased: number;
  status: string;
  created_at: string;
}

export default function Profile() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [recoverPayment, setRecoverPayment] = useState<{ qrCode: string; qrCodeBase64: string; paymentId: string; credits: number; amount: number } | null>(null);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const isExpired = (createdAt: string) => {
    return Date.now() - new Date(createdAt).getTime() > 60 * 60 * 1000;
  };

  const loadPayments = useCallback(() => {
    if (!user) return;
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const filtered = (data || []).filter(
          (p: Payment) => !(p.status === "pending" && isExpired(p.created_at))
        );
        setPayments(filtered as Payment[]);
        setLoadingPayments(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, cpf")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.cpf) setCpf(formatCpf(data.cpf));
      });
    loadPayments();
  }, [user, loadPayments]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const cleanCpf = cpf.replace(/\D/g, "");
    const updateData: { display_name: string; cpf?: string | null } = { display_name: displayName };
    if (cleanCpf.length === 11) {
      updateData.cpf = cleanCpf;
    } else if (cleanCpf.length === 0) {
      updateData.cpf = null;
    }
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
    }
  };

  const handleRecoverPayment = async (payment: Payment) => {
    setRecoverLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/mercadopago-payment?action=recover-payment&payment_id=${payment.id}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: supabaseKey,
          },
        }
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao recuperar pagamento");

      if (data.status === "approved") {
        toast({ title: "Pagamento já aprovado! 🎉" });
        loadPayments();
        return;
      }

      setRecoverPayment({
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
        paymentId: payment.id,
        credits: data.credits_purchased,
        amount: data.amount_cents,
      });

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${supabaseUrl}/functions/v1/mercadopago-payment?action=check-status&payment_id=${payment.id}`,
            {
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
                apikey: supabaseKey,
              },
            }
          );
          const statusData = await statusRes.json();
          if (statusData.status === "approved") {
            if (pollRef.current) clearInterval(pollRef.current);
            setRecoverPayment(null);
            setRecoverSuccess(true);
            loadPayments();
          }
        } catch {}
      }, 5000);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRecoverLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "pending": return <Clock className="w-4 h-4 text-warning" />;
      default: return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "approved": return "Aprovado";
      case "pending": return "Pendente";
      case "expired": return "Expirado";
      default: return "Falhou";
    }
  };

  const bgLayer = (
    <>
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${spaceBg})` }} />
      <div className="fixed inset-0 z-0 bg-background/40" />
    </>
  );

  if (recoverSuccess) {
    return (
      <div className="min-h-screen flex flex-col relative">
        {bgLayer}
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">
          <SuccessStep
            quantity={0}
            onGoHome={() => {
              setRecoverSuccess(false);
              loadPayments();
            }}
          />
        </div>
      </div>
    );
  }

  if (recoverPayment) {
    return (
      <div className="min-h-screen flex flex-col relative">
        {bgLayer}
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <QrCodeStep
              qrCode={recoverPayment.qrCode}
              qrCodeBase64={recoverPayment.qrCodeBase64}
              quantity={recoverPayment.credits}
              total={(recoverPayment.amount / 100).toFixed(2)}
              onCancel={() => {
                if (pollRef.current) clearInterval(pollRef.current);
                setRecoverPayment(null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {bgLayer}
      <div className="relative z-10 flex flex-col min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-foreground">Perfil</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fade-in flex-1 w-full">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted border-border font-mono text-sm rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Nome</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-muted border-border rounded-xl h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              CPF (usado nos pagamentos PIX)
            </Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="bg-muted border-border font-mono text-sm rounded-xl h-11"
              maxLength={14}
            />
            <p className="text-xs text-muted-foreground">Altere aqui o CPF salvo para pagamentos.</p>
          </div>
          <Button onClick={handleSave} disabled={loading} className="rounded-full px-6">
            {loading ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              Histórico de Pagamentos
            </h3>
          </div>
          {loadingPayments ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm">Nenhum pagamento realizado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => {
                const isPendingValid = p.status === "pending" && !isExpired(p.created_at);
                return (
                  <div
                    key={p.id}
                    onClick={() => isPendingValid && handleRecoverPayment(p)}
                    className={`p-4 transition-colors ${
                      isPendingValid
                        ? "hover:bg-primary/5 cursor-pointer border-l-2 border-l-warning"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon(p.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-mono text-foreground">
                            {p.credits_purchased} crédito{p.credits_purchased > 1 ? "s" : ""}
                          </p>
                          <span className="text-sm font-mono font-semibold text-foreground">
                            R$ {(p.amount_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleString("pt-BR")}
                          </p>
                          <div className="flex items-center gap-2">
                            {isPendingValid && (
                              <span className="text-xs text-primary font-medium">Clique para pagar →</span>
                            )}
                            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                              p.status === "approved" ? "text-success bg-success/10" : p.status === "pending" ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10"
                            }`}>
                              {statusLabel(p.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <AppFooter />
      </div>
    </div>
  );
}
