import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-4xl font-bold text-primary font-mono">404</span>
        </div>
        <p className="text-lg text-muted-foreground">Página não encontrada</p>
        <Button asChild variant="outline" className="rounded-full px-6">
          <a href="/">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao início
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
