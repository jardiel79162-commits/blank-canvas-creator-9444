import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Sparkles, Coins } from "lucide-react";
import confetti from "canvas-confetti";

interface SuccessStepProps {
  quantity: number;
  onGoHome: () => void;
}

export default function SuccessStep({ quantity, onGoHome }: SuccessStepProps) {
  useEffect(() => {
    // Fire confetti on mount
    const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };
    confetti({ ...defaults, particleCount: 60, origin: { x: 0.3, y: 0.5 } });
    confetti({ ...defaults, particleCount: 60, origin: { x: 0.7, y: 0.5 } });
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 40, origin: { x: 0.5, y: 0.3 } });
    }, 250);
  }, []);

  return (
    <div className="glass-card rounded-2xl p-8 space-y-8 animate-fade-in text-center">
      {/* Success icon with rings */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute -inset-6 rounded-full bg-success/10 animate-pulse-glow" />
          <div className="absolute -inset-3 rounded-full border border-success/20" />
          {/* Main icon */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center border border-success/30">
            <CheckCircle2 className="w-10 h-10 text-success animate-scale-in" />
          </div>
          {/* Sparkle accents */}
          <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-warning animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-3 w-4 h-4 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">Pagamento Confirmado!</h2>
        <div className="inline-flex items-center gap-2 rounded-full bg-success/10 border border-success/20 px-4 py-2">
          <Coins className="w-4 h-4 text-success" />
          <span className="text-sm font-semibold text-success font-mono">
            +{quantity} crédito{quantity > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Seus créditos já estão disponíveis para uso. Aproveite seus remixes!
        </p>
      </div>

      {/* CTA */}
      <Button
        onClick={onGoHome}
        variant="glow"
        size="lg"
        className="w-full rounded-full h-12 text-base btn-hover-pop"
      >
        <ArrowRight />
        Começar a usar
      </Button>
    </div>
  );
}
