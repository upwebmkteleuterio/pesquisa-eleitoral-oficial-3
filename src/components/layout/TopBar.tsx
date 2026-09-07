import { Wifi, WifiOff, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { useUIStore } from "../../store";
import { useQuery } from "@tanstack/react-query";
import { userService } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import icon from "../../assets/icon_veraxus.png";

export function TopBar() {
  const { toggleTheme } = useUIStore();
  const { signOut, profile } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { data: researcher } = useQuery({
    queryKey: ['researcher_profile'],
    queryFn: () => userService.getProfile()
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isAdmin = profile?.role === 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-50">
      <div className="flex items-center justify-between h-full px-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border border-outline p-1.5 overflow-hidden">
             <img src={icon} alt="Veraxus" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-[#053261] dark:text-primary-container tracking-tight leading-none uppercase">Veraxus</span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] leading-none">Pesquisas</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
             "hidden sm:flex px-2 py-1 rounded-full items-center gap-1 text-[10px] font-bold uppercase mr-1",
             isOnline 
               ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" 
               : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
          )}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? "Online" : "Offline"}
          </div>

          {isAdmin && (
            <Link 
              to="/adm" 
              className="p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-all border border-primary/20 flex items-center gap-2 mr-1"
              title="Painel Administrativo"
            >
              <ShieldCheck size={20} />
              <span className="text-[10px] font-black uppercase tracking-tight hidden xs:block">Admin</span>
            </Link>
          )}

          <ThemeToggle />

          <div className="relative group ml-1">
             <button 
               onClick={() => {
                 if (window.confirm("Deseja realmente sair do sistema?")) {
                   signOut();
                 }
               }}
               className="w-10 h-10 rounded-xl overflow-hidden border-2 border-primary/20 hover:border-primary shadow-sm transition-all group-hover:bg-primary group flex items-center justify-center bg-white dark:bg-slate-800"
               title="Sair / Logout"
             >
                {researcher?.foto_avatar_url ? (
                  <img 
                    src={researcher.foto_avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover group-hover:hidden transition-all"
                  />
                ) : (
                  <UserIcon className="text-primary group-hover:hidden" size={20} />
                )}
                <LogOut className="hidden group-hover:block text-white" size={20} />
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}