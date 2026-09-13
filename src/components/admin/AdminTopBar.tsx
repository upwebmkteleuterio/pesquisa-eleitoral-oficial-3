import { Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface AdminTopBarProps {
  onMenuClick: () => void;
}

export function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  const { profile } = useAuth();
  const isClient = profile?.role === 'cliente';

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-outline flex items-center justify-between px-6 lg:px-8 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-lg font-bold text-on-surface">Painel Administrativo</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-on-surface">{isClient ? "Cliente" : "Administrador"}</span>
          <span className="text-[10px] text-primary font-black uppercase tracking-widest">{isClient ? "Leitura" : "Master"}</span>
        </div>
      </div>
    </header>
  );
}
