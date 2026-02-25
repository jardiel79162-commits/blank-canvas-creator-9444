import { GitBranch, Menu, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  credits?: number;
  onMenuOpen: () => void;
}

export default function AppHeader({ credits, onMenuOpen }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onMenuOpen}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm shadow-primary/20">
              <GitBranch className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-mono text-foreground text-sm">JTC RemixHub</span>
          </div>
        </div>

        {credits !== undefined && (
          <button
            onClick={() => navigate("/store")}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-muted hover:bg-muted/80 transition-colors"
          >
            <Coins className="w-4 h-4 text-warning" />
            <span className="text-sm font-mono font-semibold text-foreground">{credits}</span>
          </button>
        )}
      </div>
    </header>
  );
}
