import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, ShieldCheck, X } from "lucide-react";

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
    <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pagamento PIX</h2>
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/50 border border-border p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {quantity} crédito{quantity > 1 ? "s" : ""}
          </span>
          <span className="text-lg font-bold font-mono text-foreground">R$ {total}</span>
        </div>
      </div>

      {/* CPF Input */}
      <div className="space-y-3">
        <Label htmlFor="cpf" className="text-sm text-muted-foreground">
          {hasSaved ? "CPF salvo" : "Informe seu CPF"}
        </Label>
        <Input
          id="cpf"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          className="bg-muted border-border font-mono text-center text-lg tracking-wider"
          maxLength={14}
          disabled={loading}
        />
        {!isValid && rawCpf.length > 0 && (
          <p className="text-xs text-destructive">CPF deve ter 11 dígitos</p>
        )}
      </div>

      {/* Save checkbox */}
      {!hasSaved && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border p-3">
          <Checkbox
            id="save-cpf"
            checked={saveCpf}
            onCheckedChange={(checked) => setSaveCpf(checked === true)}
          />
          <Label htmlFor="save-cpf" className="text-sm text-muted-foreground cursor-pointer leading-snug">
            Salvar este CPF para próximos pagamentos
          </Label>
        </div>
      )}

      {hasSaved && (
        <p className="text-xs text-muted-foreground text-center">
          Para alterar seu CPF, acesse as configurações do perfil.
        </p>
      )}

      {/* Continue button */}
      <Button
        onClick={() => onSubmit(rawCpf, saveCpf)}
        variant="glow"
        size="lg"
        className="w-full"
        disabled={!isValid || loading}
      >
        {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {loading ? "Gerando PIX..." : "Continuar"}
      </Button>
    </div>
  );
}
