import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from "lucide-react";

interface SuccessStepProps {
  quantity: number;
  onGoHome: () => void;
}

export default function SuccessStep({ quantity, onGoHome }: SuccessStepProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 space-y-6 shadow-2xl animate-fade-in text-center">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-green-500/10 p-4">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h2>
        <p className="text-sm text-muted-foreground">
          {quantity} crédito{quantity > 1 ? "s foram adicionados" : " foi adicionado"} à sua conta com sucesso.
        </p>
      </div>

      {/* Go home button */}
      <Button
        onClick={onGoHome}
        variant="glow"
        size="lg"
        className="w-full"
      >
        <Home className="w-4 h-4" />
        Voltar à tela inicial
      </Button>
    </div>
  );
}
