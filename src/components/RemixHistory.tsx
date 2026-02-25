import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, XCircle, Loader2, Trash2, Terminal, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import MiniTerminal from "@/components/MiniTerminal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RemixRecord {
  id: string;
  source_repo: string;
  target_repo: string;
  status: string;
  error_message: string | null;
  created_at: string;
  logs: string[] | null;
}

interface RemixHistoryProps {
  refreshKey: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "completed", label: "Sucesso" },
  { value: "error", label: "Erro" },
  { value: "processing", label: "Processando" },
];

function exportCSV(data: RemixRecord[]) {
  const header = "Data,Origem,Destino,Status,Erro\n";
  const rows = data.map(r =>
    `"${new Date(r.created_at).toLocaleString("pt-BR")}","${r.source_repo}","${r.target_repo}","${r.status}","${r.error_message || ""}"`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `remix-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RemixHistory({ refreshKey }: RemixHistoryProps) {
  const [history, setHistory] = useState<RemixRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("remix_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setHistory((data as RemixRecord[]) || []);
      setLoading(false);
    };
    fetchHistory();
  }, [user, refreshKey]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch = searchQuery.length === 0 ||
        item.source_repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.target_repo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [history, statusFilter, searchQuery]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("remix_history").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setHistory((prev) => prev.filter((item) => item.id !== deleteId));
      toast({ title: "Registro excluído" });
    }
    setDeleteId(null);
    setSelectedId(null);
  };

  const openTerminal = (item: RemixRecord) => {
    if (item.logs && item.logs.length > 0) {
      setTerminalLogs(item.logs);
    } else {
      const logs: string[] = [];
      logs.push(`📋 Remix: ${item.source_repo} → ${item.target_repo}`);
      logs.push(`📅 Data: ${new Date(item.created_at).toLocaleString("pt-BR")}`);
      logs.push(`📊 Status: ${item.status}`);
      if (item.status === "completed") {
        logs.push("✅ Remix concluído com sucesso!");
      } else if (item.status === "error") {
        logs.push(`❌ Erro: ${item.error_message || "Desconhecido"}`);
      } else if (item.status === "processing") {
        logs.push("⏳ Remix ainda em andamento...");
      } else {
        logs.push("🕐 Pendente...");
      }
      setTerminalLogs(logs);
    }
    setTerminalVisible(true);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "error": return <XCircle className="w-4 h-4 text-destructive" />;
      case "processing": return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">Nenhum remix realizado ainda.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              Histórico
              <span className="text-xs text-muted-foreground font-normal">({filteredHistory.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(filteredHistory)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors rounded-full px-2.5 py-1.5 hover:bg-primary/10"
                title="Exportar CSV"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar repositório..."
                className="pl-9 h-9 rounded-xl text-xs bg-transparent border-border"
              />
            </div>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === opt.value
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {filteredHistory.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id}>
                <div
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{statusIcon(item.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">{item.source_repo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">→ {item.target_repo}</p>
                      {item.error_message && (
                        <p className="text-xs text-destructive mt-1">{item.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedId === item.id && (
                  <div className="flex items-center gap-2 px-4 pb-3 animate-fade-in">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTerminal(item);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary text-xs font-mono transition-colors btn-hover-pop"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Ver logs
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive text-xs font-mono transition-colors btn-hover-pop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <MiniTerminal
        logs={terminalLogs}
        visible={terminalVisible}
        onClose={() => setTerminalVisible(false)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro do histórico? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-full">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
