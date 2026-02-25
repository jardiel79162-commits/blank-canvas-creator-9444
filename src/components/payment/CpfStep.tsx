import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, ShieldCheck, CreditCard, Coins, Sparkles } from "lucide-react";

interface CpfStepProps {
  savedCpf: string;
  quantity: number;
  total: string;
  loading: boolean;
  onSubmit: (cpf: string, saveCpf: boolean) => void;
  onCancel: () => void;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatSavedCpf(cpf: string): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return cpf;
}

export default function CpfStep({ savedCpf, quantity, total, loading, onSubmit, onCancel }: CpfStepProps) {
  const [cpf, setCpf] = useState(savedCpf ? formatSavedCpf(savedCpf) : "");
  const [saveCpf, setSaveCpf] = useState(!savedCpf);
  const hasSaved = !!savedCpf;

  const rawCpf = cpf.replace(/\D/g, "");
  const isValid = rawCpf.length === 11;

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6 animate-fade-in">
      {/* Order Summary Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/20 p-5">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Coins className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {quantity} crédito{quantity > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">Pacote de remix</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-gradient">R$ {total}</p>
            <p className="text-[10px] text-muted-foreground/60">via PIX</p>
          </div>
        </div>
      </div>

      {/* CPF Saved Banner */}
      {hasSaved && (
        <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-primary">CPF salvo</p>
                <Sparkles className="w-3 h-3 text-primary/60" />
              </div>
              <p className="text-base font-mono text-foreground tracking-widest mt-0.5">{formatSavedCpf(savedCpf)}</p>
            </div>
          </div>
        </div>
      )}

      {/* CPF Input */}
      <div className="space-y-2.5">
        <Label htmlFor="cpf" className="text-sm text-muted-foreground flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          {hasSaved ? "Confirme ou edite seu CPF" : "Informe seu CPF para o PIX"}
        </Label>
        <div className="relative">
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            className="glass-input font-mono text-center text-lg tracking-[0.2em] rounded-xl h-12 bg-transparent border-primary/20 placeholder:text-muted-foreground/40"
            maxLength={14}
            disabled={loading}
          />
          {isValid && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
                <span className="text-success text-xs">✓</span>
              </div>
            </div>
          )}
        </div>
        {!isValid && rawCpf.length > 0 && rawCpf.length < 11 && (
          <p className="text-xs text-warning flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-warning inline-block" />
            CPF deve ter 11 dígitos ({rawCpf.length}/11)
          </p>
        )}
      </div>

      {/* Save checkbox */}
      {!hasSaved && (
        <div className="flex items-center gap-3 rounded-xl glass-card p-3.5">
          <Checkbox
            id="save-cpf"
            checked={saveCpf}
            onCheckedChange={(checked) => setSaveCpf(checked === true)}
          />
          <Label htmlFor="save-cpf" className="text-sm text-muted-foreground/80 cursor-pointer leading-snug">
            Salvar CPF para próximos pagamentos
          </Label>
        </div>
      )}

      {hasSaved && (
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Altere permanentemente em Perfil → Configurações
        </p>
      )}

      {/* Continue button */}
      <Button
        onClick={() => onSubmit(rawCpf, saveCpf)}
        variant="glow"
        size="lg"
        className="w-full rounded-full h-12 text-base btn-hover-pop"
        disabled={!isValid || loading}
      >
        {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {loading ? "Gerando PIX..." : "Gerar QR Code PIX"}
      </Button>
    </div>
  );
}
