import { Users, FileText, Map, Settings, PieChart, Database, Trophy, X, Sparkles, ChevronLeft, ChevronRight, History, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAssistant: () => void;
}

export function AdminSidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, onOpenAssistant }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const isClient = profile?.role === 'cliente';

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const menuSections = [
    {
      title: "CADASTROS",
      items: [
        { icon: Users, label: "Pesquisadores", path: "/adm/pesquisadores" },
        { icon: Users, label: "Clientes", path: "/adm/clientes" },
        { icon: FileText, label: "Formulários", path: "/adm/formularios" },
        { icon: Map, label: "Regiões", path: "/adm/regioes" },
      ]
    },
    {
      title: "INTELIGÊNCIA",
      items: [
        { icon: Sparkles, label: "Gerar com IA", path: "/adm/gerar-ia" },
      ]
    },
    {
      title: "ANÁLISE",
      items: [
        { icon: History, label: "Histórico", path: "/adm/historico" },
        { icon: Database, label: "Respostas", path: "/adm/respostas" },
        { icon: PieChart, label: "Relatórios", path: "/adm/relatorios" },
        { icon: Trophy, label: "Ranking de Produtividade", path: "/adm/ranking" },
      ]
    }
  ];
  const visibleSections = isClient
    ? [{ title: "ANÁLISE", items: menuSections[2].items.filter(item => item.path === "/adm/respostas" || item.path === "/adm/relatorios") }]
    : menuSections;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed inset-y-0 left-0 bg-slate-900 text-white z-50 transition-transform duration-300 transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 outline-none flex flex-col overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3 flex items-center justify-between shrink-0 border-b border-slate-800/50">
            {!isCollapsed ? (
              <h1 className="text-xl font-black tracking-tighter text-white animate-in fade-in duration-300">
                VERAXUS <span className="text-primary italic text-sm">ADM</span>
              </h1>
            ) : (
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center font-black text-xs">V</div>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden text-slate-400 hover:text-white"
                title="Fechar menu"
                aria-label="Fechar menu"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Navigation with Sections */}
          <nav className={cn(
            "flex-1 px-4 py-6 space-y-8 custom-scrollbar",
            isCollapsed ? "overflow-hidden" : "overflow-y-auto"
          )}>
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-2">
                {!isCollapsed && (
                  <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => window.innerWidth < 1024 && onClose()}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all relative group",
                          isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white",
                          isCollapsed && "justify-center px-0"
                        )}
                        title={isCollapsed ? item.label : ""}
                      >
                        <item.icon size={20} className="shrink-0" />
                        {!isCollapsed && (
                          <span className="animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap text-sm">
                            {item.label}
                          </span>
                        )}
                        {isCollapsed && (
                          <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-slate-700 pointer-events-none">
                            {item.label}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                  {section.title === "INTELIGÊNCIA" && !isClient && (
                    <button
                      type="button"
                      onClick={onOpenAssistant}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 font-bold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isCollapsed && "justify-center px-0"
                      )}
                      title="Assistente de IA"
                      aria-label="Abrir Assistente de IA"
                    >
                      <Sparkles size={20} className="shrink-0" />
                      {!isCollapsed && <span className="text-sm">Assistente de IA</span>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 space-y-2 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-slate-400 font-bold hover:text-white hover:bg-slate-800 rounded-xl transition-all",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? "Sair" : ""}
              aria-label="Sair"
            >
              <LogOut size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-300 text-sm whitespace-nowrap">Logout</span>}
            </button>

            {!isClient && (
              <Link
                to="/"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-slate-400 font-bold hover:text-white hover:bg-slate-800 rounded-xl transition-all",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? "Sair do Painel" : ""}
              >
                <Settings size={20} className="shrink-0" />
                {!isCollapsed && <span className="animate-in fade-in duration-300 text-sm whitespace-nowrap">Voltar ao App</span>}
              </Link>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}