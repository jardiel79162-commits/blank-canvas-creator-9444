import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, ShoppingCart, Plus, Minus } from "lucide-react";
import PaymentFlow from "@/components/PaymentFlow";

interface CreditStoreProps {
  credits: number;
  onPurchaseComplete: () => void;
}

export default function CreditStore({ credits, onPurchaseComplete }: CreditStoreProps) {
  const [quantity, setQuantity] = useState(10);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();

  const unitPrice = 0.5;
  const total = (quantity * unitPrice).toFixed(2);

  const adjustQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10000, prev + delta)));
  };

  const handlePaymentComplete = () => {
    onPurchaseComplete();
  };

  const handleClose = () => {
    setShowPayment(false);
    navigate("/");
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5 animate-fade-in shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Loja de Créditos</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <Coins className="w-4 h-4 text-warning" />
            <span className="text-sm font-mono font-semibold text-foreground">{credits}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20 p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Preço por crédito</p>
          <p className="text-3xl font-bold text-foreground font-mono">R$ 0,50</p>
          <p className="text-xs text-muted-foreground mt-1.5">1 crédito = 1 remix</p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Quantidade de créditos</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => adjustQuantity(-1)} disabled={quantity <= 1}>
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min={1}
              max={10000}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
              className="bg-muted border-border font-mono text-center text-lg rounded-xl h-11"
            />
            <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => adjustQuantity(1)} disabled={quantity >= 10000}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[5, 10, 25, 50, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQuantity(n)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-colors border ${
                  quantity === n
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted p-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold font-mono text-foreground">R$ {total}</span>
        </div>

        <Button
          onClick={() => setShowPayment(true)}
          variant="glow"
          size="lg"
          className="w-full rounded-full h-12 text-base"
        >
          <ShoppingCart />
          {`Comprar ${quantity} crédito${quantity > 1 ? "s" : ""}`}
        </Button>
      </div>

      {showPayment && (
        <PaymentFlow
          quantity={quantity}
          onClose={handleClose}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </>
  );
}
