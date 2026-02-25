import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, QrCode, Loader2, Clock, ShieldCheck } from "lucide-react";

interface QrCodeStepProps {
  qrCode: string;
  qrCodeBase64: string;
  quantity: number;
  total: string;
  onCancel: () => void;
}

export default function QrCodeStep({ qrCode, qrCodeBase64, quantity, total, onCancel }: QrCodeStepProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 min

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 5 * 60;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = qrCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-2xl animate-fade-in max-w-sm mx-auto">
      {/* Header com valor */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
          <QrCode className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Pagamento PIX</span>
        </div>
        <div className="pt-1">
          <p className="text-3xl font-bold font-mono text-foreground tracking-tight">
            R$ {total}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quantity} crédito{quantity > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* QR Code com borda animada */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent animate-pulse-glow" />
          <div className="relative rounded-xl bg-white p-3 shadow-lg">
            {qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-52 h-52"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className={`flex items-center justify-center gap-2 text-sm font-mono ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>
          Expira em {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* Copiar código */}
      <Button
        onClick={handleCopy}
        variant={copied ? "default" : "outline"}
        className={`w-full font-mono text-xs gap-2 transition-all ${copied ? "bg-green-600 hover:bg-green-600 text-white border-green-600" : ""}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Código copiado!" : "Copiar código PIX"}
      </Button>

      {/* Status aguardando */}
      <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 border border-primary/20 p-3">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-primary/40 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-sm text-muted-foreground">Aguardando confirmação do pagamento…</span>
      </div>

      {/* Segurança */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
        <ShieldCheck className="w-3 h-3" />
        <span>Pagamento seguro via Mercado Pago</span>
      </div>

      {/* Cancelar */}
      <button
        onClick={onCancel}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center pt-1"
      >
        Cancelar pagamento
      </button>
    </div>
  );
}
