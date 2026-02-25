import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, QrCode, Loader2, Clock, ShieldCheck, Coins, Smartphone } from "lucide-react";

interface QrCodeStepProps {
  qrCode: string;
  qrCodeBase64: string;
  quantity: number;
  total: string;
  onCancel: () => void;
}

export default function QrCodeStep({ qrCode, qrCodeBase64, quantity, total, onCancel }: QrCodeStepProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 5 * 60;
  const progress = (timeLeft / (30 * 60)) * 100;

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
    <div className="glass-card rounded-2xl p-6 space-y-5 animate-fade-in max-w-sm mx-auto">
      {/* Value Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-1.5 shadow-lg shadow-primary/20">
          <Coins className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-bold text-primary-foreground">
            {quantity} crédito{quantity > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-3xl font-bold font-mono text-gradient tracking-tight">
          R$ {total}
        </p>
      </div>

      {/* QR Code with animated border */}
      <div className="flex justify-center">
        <div className="relative group">
          {/* Animated glow ring */}
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-primary/20 animate-pulse-glow opacity-70" />
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/20 to-transparent" />
          <div className="relative rounded-xl bg-white p-3 shadow-2xl shadow-primary/10">
            {qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-52 h-52 animate-scale-in"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border/50 p-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Abra o app do seu banco, selecione <span className="text-foreground font-medium">Pagar com PIX</span> e escaneie o QR Code acima.
        </p>
      </div>

      {/* Timer with progress bar */}
      <div className="space-y-2">
        <div className={`flex items-center justify-center gap-2 text-sm font-mono ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>
            Expira em {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-destructive" : "bg-primary/60"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Copy button */}
      <Button
        onClick={handleCopy}
        variant={copied ? "default" : "outline"}
        className={`w-full font-mono text-xs gap-2 rounded-full h-10 transition-all btn-hover-pop ${
          copied ? "bg-success hover:bg-success text-success-foreground border-success" : "border-primary/20 hover:border-primary/40 hover:bg-primary/5"
        }`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Código copiado!" : "Copiar código PIX"}
      </Button>

      {/* Waiting status */}
      <div className="flex items-center justify-center gap-2.5 rounded-xl bg-primary/5 border border-primary/15 p-3.5">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-primary/30 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="text-sm text-muted-foreground">Aguardando pagamento…</span>
      </div>

      {/* Security + Cancel */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
          <ShieldCheck className="w-3 h-3" />
          <span>Pagamento seguro via Mercado Pago</span>
        </div>
        <button
          onClick={onCancel}
          className="w-full text-xs text-muted-foreground/50 hover:text-destructive transition-colors text-center"
        >
          Cancelar pagamento
        </button>
      </div>
    </div>
  );
}
