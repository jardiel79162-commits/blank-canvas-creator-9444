import { Cpu, Shield, Zap, Globe, Code, Layers } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Performance Extrema",
    description: "Build times até 10x mais rápidos com nossa infraestrutura otimizada e cache inteligente.",
  },
  {
    icon: Shield,
    title: "Segurança Zero-Trust",
    description: "Proteção de nível enterprise com encriptação end-to-end e compliance automático.",
  },
  {
    icon: Globe,
    title: "Deploy Global",
    description: "CDN edge em 100+ regiões. Sua aplicação a milissegundos de qualquer usuário.",
  },
  {
    icon: Code,
    title: "DX Incomparável",
    description: "Hot reload instantâneo, debugging avançado e integração nativa com seu stack.",
  },
  {
    icon: Layers,
    title: "Arquitetura Modular",
    description: "Componentes reutilizáveis e escaláveis. Do MVP à produção sem reescrita.",
  },
  {
    icon: Cpu,
    title: "AI-Powered",
    description: "Sugestões inteligentes, auto-complete avançado e otimização automática de código.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      
      <div className="container relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Tudo que você precisa,{" "}
            <span className="text-gradient">nada que não precisa</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas poderosas projetadas para desenvolvedores que exigem o melhor.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-primary/50 hover:bg-card/60 transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
