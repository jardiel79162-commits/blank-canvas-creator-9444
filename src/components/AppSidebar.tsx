import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, LogOut, GitBranch, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  credits?: number;
}

const navItems = [
  { label: "Loja de Créditos", icon: ShoppingCart, path: "/store" },
  { label: "Meu Perfil", icon: User, path: "/profile" },
];

export default function AppSidebar({ open, onClose, credits }: AppSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm shadow-primary/20">
              <GitBranch className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-mono text-foreground">JTC RemixHub</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {credits !== undefined && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 text-sm">
              <span className="text-muted-foreground">Créditos</span>
              <span className="font-bold font-mono text-foreground">{credits}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  );
}
