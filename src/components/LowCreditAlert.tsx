import { AlertTriangle, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LowCreditAlertProps {
  credits: number;
}

export default function LowCreditAlert({ credits }: LowCreditAlertProps) {
  const navigate = useNavigate();

  if (credits >= 3) return null;

  return (
    <button
      onClick={() => navigate("/store")}
      className="w-full flex items-center gap-3 rounded-2xl glass-card p-4 text-sm animate-fade-in group hover:border-warning/30 transition-colors cursor-pointer"
    >
      <div className="w-9 h-9 rounded-xl bg-warning/20 border border-warning/30 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-warning" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-semibold text-foreground">
          {credits === 0 ? "Sem créditos!" : `Apenas ${credits} crédito${credits > 1 ? "s" : ""} restante${credits > 1 ? "s" : ""}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Clique para recarregar na loja</p>
      </div>
      <Coins className="w-5 h-5 text-warning group-hover:scale-110 transition-transform" />
    </button>
  );
}
