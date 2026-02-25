import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import spaceBg from "@/assets/space-bg.jpg";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getAuthErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro inesperado ao autenticar";

    if (message.includes("Failed to fetch")) {
      return "Falha de conexão com o servidor de autenticação. Verifique sua internet, VPN/proxy ou DNS e tente novamente.";
    }

    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        navigate("/");
      } else {
        await signUp(email, password, displayName);
        toast({ title: "Conta criada!" });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${spaceBg})` }} />
      <div className="fixed inset-0 z-0 bg-background/40" />
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <GitBranch className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-mono">JTC RemixHub</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Remix projetos GitHub de forma ilimitada
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10">
          <div className="flex mb-6 bg-muted rounded-full p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 text-sm py-2.5 rounded-full transition-all font-medium ${
                isLogin ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 text-sm py-2.5 rounded-full transition-all font-medium ${
                !isLogin ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm text-muted-foreground">Nome</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-muted border-border rounded-xl h-11"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-muted border-border rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-muted border-border rounded-xl h-11"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-12 text-base" variant="glow" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
