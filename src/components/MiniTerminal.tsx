import { useEffect, useRef, useMemo } from "react";
import { Terminal, X } from "lucide-react";

interface MiniTerminalProps {
  logs: string[];
  visible: boolean;
  onClose: () => void;
}

export default function MiniTerminal({ logs, visible, onClose }: MiniTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const progress = useMemo(() => {
    for (let i = logs.length - 1; i >= 0; i--) {
      const match = logs[i].match(/Lote (\d+)\/(\d+)/);
      if (match) {
        const current = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        return { current, total, percent: Math.round((current / total) * 100) };
      }
    }
    return null;
  }, [logs]);

  const isDone = logs.some((l) => l.includes("✅") || l.includes("❌"));

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-semibold text-foreground">Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-2 rounded-full p-0.5 hover:bg-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {progress && !isDone && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              Copiando arquivos...
            </span>
            <span className="text-xs font-mono font-semibold text-primary">
              {progress.percent}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Lote {progress.current}/{progress.total}
          </p>
        </div>
      )}

      {isDone && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/50">
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                logs.some((l) => l.includes("✅")) ? "bg-success" : "bg-destructive"
              }`}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="p-4 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed space-y-1 bg-background/50"
      >
        {logs.length === 0 ? (
          <p className="text-muted-foreground">Aguardando...</p>
        ) : (
          logs.map((line, i) => (
            <p
              key={i}
              className={
                line.includes("❌")
                  ? "text-destructive"
                  : line.includes("✅")
                  ? "text-success"
                  : "text-foreground/80"
              }
            >
              <span className="text-muted-foreground mr-2 select-none">{String(i + 1).padStart(2, "0")}</span>
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
