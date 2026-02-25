import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
      
      <div className="container relative z-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-primary/30 bg-primary/5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Grátis para começar</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Pronto para{" "}
            <span className="text-gradient">revolucionar</span>
            ?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Junte-se a milhares de desenvolvedores que já estão construindo o futuro com nossa plataforma.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="xl">
              Criar conta grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Falar com vendas
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            Sem cartão de crédito • Setup em 2 minutos • Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
