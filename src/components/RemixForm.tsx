import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GitBranch, ArrowDownUp, Loader2, Eye, EyeOff, Clock, ChevronDown, ExternalLink, CheckCircle2, XCircle, Eraser } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MiniTerminal from "@/components/MiniTerminal";
import confetti from "canvas-confetti";

interface RemixFormProps {
  credits: number;
  onRemixComplete: () => void;
}

const GITHUB_URL_REGEX = /github\.com\/([^/]+)\/([^/\s]+)/;

function useUrlValidation(url: string) {
  const isValid = url.length === 0 ? null : GITHUB_URL_REGEX.test(url);
  return isValid;
}

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 } });
  }, 200);
}

export default function RemixForm({ credits, onRemixComplete }: RemixFormProps) {
  const [sourceRepo, setSourceRepo] = useState(() => localStorage.getItem("remix_sourceRepo") || "");
  const [targetRepo, setTargetRepo] = useState(() => localStorage.getItem("remix_targetRepo") || "");
  const [sameAccount, setSameAccount] = useState(() => localStorage.getItem("remix_sameAccount") !== "false");
  const [sourceToken, setSourceToken] = useState(() => localStorage.getItem("remix_sourceToken") || "");
  const [targetToken, setTargetToken] = useState(() => localStorage.getItem("remix_targetToken") || "");

  useEffect(() => {
    localStorage.setItem("remix_sourceRepo", sourceRepo);
    localStorage.setItem("remix_targetRepo", targetRepo);
    localStorage.setItem("remix_sameAccount", String(sameAccount));
    localStorage.setItem("remix_sourceToken", sourceToken);
    localStorage.setItem("remix_targetToken", targetToken);
  }, [sourceRepo, targetRepo, sameAccount, sourceToken, targetToken]);

  const [showSourceToken, setShowSourceToken] = useState(false);
  const [showTargetToken, setShowTargetToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [remixesLeft, setRemixesLeft] = useState(3);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const { session, user } = useAuth();
  const { toast } = useToast();

  const sourceValid = useUrlValidation(sourceRepo);
  const targetValid = useUrlValidation(targetRepo);

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loading && credits >= 1 && remixesLeft >= 1) {
        const form = document.getElementById("remix-form") as HTMLFormElement;
        form?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, credits, remixesLeft]);

  useEffect(() => {
    if (!user) return;
    const checkRate = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("remix_history")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo)
        .in("status", ["processing", "completed"]);

      const count = data?.length || 0;
      setRemixesLeft(Math.max(0, 3 - count));

      if (count >= 3 && data) {
        const oldest = data.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        const unlockTime = new Date(new Date(oldest.created_at).getTime() + 60 * 60 * 1000);
        const mins = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
        setCooldownMinutes(Math.max(0, mins));
      } else {
        setCooldownMinutes(0);
      }
    };
    checkRate();
    const interval = setInterval(checkRate, 30000);
    return () => clearInterval(interval);
  }, [user, loading]);

  const parseRepo = (url: string) => {
    const match = url.match(GITHUB_URL_REGEX);
    return match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : null;
  };

  const clearAll = () => {
    setSourceRepo("");
    setTargetRepo("");
    setSourceToken("");
    setTargetToken("");
    ["remix_sourceRepo", "remix_targetRepo", "remix_sourceToken", "remix_targetToken"].forEach(k => localStorage.removeItem(k));
    toast({ title: "Campos limpos", description: "Todos os campos foram resetados." });
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const source = parseRepo(sourceRepo);
    const target = parseRepo(targetRepo);

    if (!source || !target) {
      toast({ title: "URL inválida", description: "Verifique as URLs dos repositórios.", variant: "destructive" });
      return;
    }

    if (!sourceToken) {
      toast({ title: "Token necessário", description: "Insira o token GitHub.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setLogs([]);
    setTerminalVisible(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/github-remix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          sourceRepo: source,
          targetRepo: target,
          sourceToken,
          targetToken: sameAccount ? sourceToken : targetToken,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro desconhecido");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("Stream não disponível");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.log) {
                setLogs((prev) => [...prev, payload.log]);
              }
              if (payload.done) {
                fireConfetti();
                toast({ title: "Sucesso! 🎉", description: "Remix realizado com sucesso." });
                setSourceRepo("");
                setTargetRepo("");
                setSourceToken("");
                setTargetToken("");
                ["remix_sourceRepo", "remix_targetRepo", "remix_sourceToken", "remix_targetToken"].forEach(k => localStorage.removeItem(k));
                onRemixComplete();
              }
              if (payload.error) {
                throw new Error(payload.error);
              }
            } catch (parseErr: any) {
              if (parseErr.message && !parseErr.message.includes("JSON")) {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (error: any) {
      setLogs((prev) => [...prev, `❌ ${error.message}`]);
      toast({ title: "Erro no remix", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [sourceRepo, targetRepo, sourceToken, targetToken, sameAccount, session, toast, onRemixComplete]);

  const hasAnyField = sourceRepo || targetRepo || sourceToken || targetToken;

  const ValidationIcon = ({ valid }: { valid: boolean | null }) => {
    if (valid === null) return null;
    return valid
      ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
      : <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <form id="remix-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Novo Remix</h2>
            </div>
            {hasAnyField && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-full px-3 py-1.5 hover:bg-destructive/10"
              >
                <Eraser className="w-3.5 h-3.5" />
                Limpar tudo
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Repositório Mãe (Origem)</Label>
            <div className="relative flex items-center gap-2">
              <Input
                value={sourceRepo}
                onChange={(e) => setSourceRepo(e.target.value)}
                placeholder="https://github.com/usuario/repositorio"
                className="glass-input font-mono text-sm rounded-xl h-11 bg-transparent border-primary/20 placeholder:text-muted-foreground/60 flex-1"
                required
              />
              <ValidationIcon valid={sourceValid} />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <ArrowDownUp className="w-4 h-4 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Repositório Filha (Destino)</Label>
            <div className="relative flex items-center gap-2">
              <Input
                value={targetRepo}
                onChange={(e) => setTargetRepo(e.target.value)}
                placeholder="https://github.com/usuario/repositorio"
                className="glass-input font-mono text-sm rounded-xl h-11 bg-transparent border-primary/20 placeholder:text-muted-foreground/60 flex-1"
                required
              />
              <ValidationIcon valid={targetValid} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl glass-input p-3.5">
            <Label className="text-sm text-foreground/80 cursor-pointer">
              Mesma conta GitHub?
            </Label>
            <Switch checked={sameAccount} onCheckedChange={setSameAccount} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Token GitHub (Origem)</Label>
            <div className="relative">
              <Input
                type={showSourceToken ? "text" : "password"}
                value={sourceToken}
                onChange={(e) => setSourceToken(e.target.value)}
                placeholder="ghp_..."
                className="glass-input font-mono text-sm pr-10 rounded-xl h-11 bg-transparent border-primary/20 placeholder:text-muted-foreground/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowSourceToken(!showSourceToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSourceToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer group">
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                Como criar o token?
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 rounded-xl glass-card p-4 space-y-4 text-sm animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-medium text-foreground">Acesse a página de tokens</p>
                    <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                      github.com/settings/tokens/new <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-medium text-foreground">Escolha o tipo de token</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Clique em <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md text-xs">Generate new token (classic)</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-medium text-foreground">Dê um nome ao token</p>
                    <p className="text-xs text-muted-foreground mt-0.5">No campo Note, coloque algo como <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md text-xs">jtc-gitremix</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <p className="font-medium text-foreground">Marque a permissão 'repo'</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Na lista de scopes, marque ☑ <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md text-xs">repo</span> (Full control of private repositories)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                  <div>
                    <p className="font-medium text-foreground">Gere e copie o token</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Clique em <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md text-xs">Generate token</span> e copie o token <span className="font-mono">ghp_...</span></p>
                  </div>
                </div>
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-primary">
                  ⚠️ Importante: O token só aparece uma vez! Copie e guarde em local seguro.
                </div>
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Criar token agora <ExternalLink className="w-3 h-3" />
                </a>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {!sameAccount && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-sm text-muted-foreground">Token GitHub (Destino)</Label>
              <div className="relative">
                <Input
                  type={showTargetToken ? "text" : "password"}
                  value={targetToken}
                  onChange={(e) => setTargetToken(e.target.value)}
                  placeholder="ghp_..."
                  className="glass-input font-mono text-sm pr-10 rounded-xl h-11 bg-transparent border-primary/20 placeholder:text-muted-foreground/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowTargetToken(!showTargetToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTargetToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {cooldownMinutes > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl glass-card p-3.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>Limite atingido. Disponível em <span className="font-mono font-semibold text-foreground">{cooldownMinutes} min</span></span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{remixesLeft}/3 remixes disponíveis nesta hora</span>
          <span className="text-muted-foreground/60">Ctrl+Enter para iniciar</span>
        </div>

        <Button type="submit" variant="glow" size="lg" className="w-full rounded-full h-12 text-base btn-hover-pop" disabled={loading || credits < 1 || remixesLeft < 1}>
          {loading ? <Loader2 className="animate-spin" /> : <GitBranch />}
          {remixesLeft < 1
            ? `Aguarde ${cooldownMinutes} min`
            : credits < 1
              ? "Sem créditos — Recarregue"
              : loading
                ? "Processando..."
                : "Iniciar Remix (1 crédito)"}
        </Button>
      </form>

      <MiniTerminal
        logs={logs}
        visible={terminalVisible}
        onClose={() => setTerminalVisible(false)}
      />
    </div>
  );
}
