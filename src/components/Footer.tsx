const Footer = () => {
  const footerLinks = {
    Produto: ["Features", "Integrações", "Preços", "Changelog"],
    Recursos: ["Documentação", "API Reference", "Guias", "Templates"],
    Empresa: ["Sobre", "Blog", "Carreiras", "Contato"],
    Legal: ["Privacidade", "Termos", "Cookies", "Licenças"],
  };

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-xl">TechFlow</span>
            </a>
            <p className="text-sm text-muted-foreground">
              Construindo o futuro do desenvolvimento web.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 mt-12 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            © 2024 TechFlow. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
