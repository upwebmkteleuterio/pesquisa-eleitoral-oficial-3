import { Users, FileText, Map, Settings, PieChart, Database, X, Sparkles, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: AdminSidebarProps) {
  const location = useLocation();

  const menuSections = [
    {
      title: "CADASTROS",
      items: [
        { icon: Users, label: "Pesquisadores", path: "/adm/pesquisadores" },
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
      ]
    }
  ];

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
          <div className={cn(
            "p-6 flex items-center shrink-0 border-b border-slate-800/50",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed && (
              <h1 className="text-xl font-black tracking-tighter text-white animate-in fade-in duration-300">
                VERAXUS <span className="text-primary italic text-sm">ADM</span>
              </h1>
            )}
            {isCollapsed && (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-xs">V</div>
            )}
            <button 
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation with Sections */}
          <nav className={cn(
            "flex-1 px-4 py-6 space-y-8 custom-scrollbar",
            isCollapsed ? "overflow-hidden" : "overflow-y-auto"
          )}>
            {menuSections.map((section) => (
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
                        
                        {/* Tooltip for collapsed state */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-slate-700 pointer-events-none">
                            {item.label}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 space-y-2 shrink-0">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center gap-3 w-full px-4 py-3 text-slate-400 font-bold hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              {!isCollapsed && <span className="animate-in fade-in duration-300 text-sm whitespace-nowrap">Recolher Menu</span>}
            </button>

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
          </div>
        </div>
      </motion.aside>
    </>
  );
}