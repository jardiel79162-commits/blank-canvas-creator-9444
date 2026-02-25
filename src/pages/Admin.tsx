import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GitBranch, LogOut, Users, Receipt, Coins, Search, Loader2, Plus, Shield, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppFooter from "@/components/AppFooter";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  credits: number;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  user_id: string;
  amount_cents: number;
  credits_purchased: number;
  status: string;
  created_at: string;
}

interface RemixRecord {
  id: string;
  user_id: string;
  source_repo: string;
  target_repo: string;
  status: string;
  created_at: string;
}

export default function Admin() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"users" | "payments" | "remixes">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [remixes, setRemixes] = useState<RemixRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creditUserId, setCreditUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [addingCredits, setAddingCredits] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    if (tab === "users") {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setUsers((data as UserProfile[]) || []);
    } else if (tab === "payments") {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      // Filter out pending payments older than 1 hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const filtered = (data || []).filter(
        (p: any) => !(p.status === "pending" && new Date(p.created_at).getTime() < oneHourAgo)
      );
      setPayments(filtered as PaymentRecord[]);
    } else {
      const { data } = await supabase
        .from("remix_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setRemixes((data as RemixRecord[]) || []);
    }
    setLoading(false);
  };

  const handleAddCredits = async () => {
    if (!creditUserId || !creditAmount) return;
    setAddingCredits(true);

    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount < 1) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      setAddingCredits(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", creditUserId)
      .maybeSingle();

    if (!profile) {
      toast({ title: "Usuário não encontrado", variant: "destructive" });
      setAddingCredits(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ credits: profile.credits + amount })
      .eq("user_id", creditUserId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${amount} créditos adicionados!` });
      setCreditAmount("");
      setCreditUserId("");
      fetchData();
    }
    setAddingCredits(false);
  };

  const handleDeleteUser = async (targetUserId: string, displayName: string | null) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${displayName || targetUserId}"? Esta ação não pode ser desfeita.`)) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Usuário excluído com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const tabs = [
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "payments" as const, label: "Pagamentos", icon: Receipt },
    { key: "remixes" as const, label: "Remixes", icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-destructive/80 flex items-center justify-center">
              <Shield className="w-4 h-4 text-destructive-foreground" />
            </div>
            <span className="font-bold font-mono text-foreground">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-mono transition-all ${
                tab === t.key
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Add credits section */}
        {tab === "users" && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Adicionar Créditos Manualmente
            </h3>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs text-muted-foreground">User ID</label>
                <Input
                  value={creditUserId}
                  onChange={(e) => setCreditUserId(e.target.value)}
                  placeholder="UUID do usuário"
                  className="bg-muted border-border font-mono text-xs"
                />
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs text-muted-foreground">Créditos</label>
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="10"
                  className="bg-muted border-border font-mono"
                />
              </div>
              <Button
                onClick={handleAddCredits}
                disabled={addingCredits || !creditUserId || !creditAmount}
                size="sm"
              >
                {addingCredits ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        {tab === "users" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou ID..."
              className="pl-10 bg-muted border-border"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {tab === "users" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-mono text-xs text-muted-foreground">Nome</th>
                      <th className="text-left p-3 font-mono text-xs text-muted-foreground">User ID</th>
                      <th className="text-right p-3 font-mono text-xs text-muted-foreground">Créditos</th>
                       <th className="text-right p-3 font-mono text-xs text-muted-foreground">Cadastro</th>
                       <th className="text-center p-3 font-mono text-xs text-muted-foreground">Ações</th>
                     </tr>
                   </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => (
                      <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-foreground">{u.display_name || "—"}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          <button
                            onClick={() => setCreditUserId(u.user_id)}
                            className="hover:text-primary transition-colors"
                            title="Clique para usar no campo de créditos"
                          >
                            {u.user_id.substring(0, 6)}...
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
                            <Coins className="w-3 h-3 text-warning" />
                            {u.credits}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(u.user_id, u.display_name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhum usuário encontrado.</p>
                )}
              </div>
            )}

            {tab === "payments" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-mono text-xs text-muted-foreground">User ID</th>
                      <th className="text-right p-3 font-mono text-xs text-muted-foreground">Créditos</th>
                      <th className="text-right p-3 font-mono text-xs text-muted-foreground">Valor</th>
                      <th className="text-center p-3 font-mono text-xs text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-mono text-xs text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs text-muted-foreground">{p.user_id.substring(0, 6)}...</td>
                        <td className="p-3 text-right font-mono text-foreground">{p.credits_purchased}</td>
                        <td className="p-3 text-right font-mono text-foreground">R$ {(p.amount_cents / 100).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                            p.status === "approved"
                              ? "bg-success/20 text-success"
                              : p.status === "pending"
                              ? "bg-warning/20 text-warning"
                              : "bg-destructive/20 text-destructive"
                          }`}>
                            {p.status === "approved" ? "Aprovado" : p.status === "pending" ? "Pendente" : "Falhou"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhum pagamento encontrado.</p>
                )}
              </div>
            )}

            {tab === "remixes" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-mono text-xs text-muted-foreground">User ID</th>
                      <th className="text-left p-3 font-mono text-xs text-muted-foreground">Origem</th>
                      <th className="text-left p-3 font-mono text-xs text-muted-foreground">Destino</th>
                      <th className="text-center p-3 font-mono text-xs text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-mono text-xs text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {remixes.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs text-muted-foreground">{r.user_id.substring(0, 6)}...</td>
                        <td className="p-3 font-mono text-xs text-foreground truncate max-w-[200px]">{r.source_repo}</td>
                        <td className="p-3 font-mono text-xs text-foreground truncate max-w-[200px]">{r.target_repo}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                            r.status === "completed"
                              ? "bg-success/20 text-success"
                              : r.status === "error"
                              ? "bg-destructive/20 text-destructive"
                              : r.status === "processing"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {remixes.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhum remix encontrado.</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
