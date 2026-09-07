import { NavLink, useNavigate } from "react-router-dom";
import { ClipboardList, RefreshCw, History, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

export function Navbar() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { to: "/", icon: ClipboardList, label: "Pesquisas" },
    { to: "/sync", icon: RefreshCw, label: "Sincronizar" },
    { to: "/history", icon: History, label: "Histórico" },
  ];

  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      signOut();
      navigate("/login");
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container border-t border-slate-200 dark:border-slate-800 h-20 pb-safe z-50">
      <div className="flex justify-around items-center h-full max-w-2xl mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                isActive 
                  ? "text-primary dark:text-primary-container" 
                  : "text-on-surface-variant hover:text-on-surface"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={24} className={cn("transition-transform", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-all", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
           <NavLink
             to="/adm"
             className={({ isActive }) =>
               cn(
                 "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                 isActive 
                   ? "text-primary dark:text-primary-container" 
                   : "text-on-surface-variant hover:text-on-surface"
               )
             }
           >
             <LayoutDashboard size={24} />
             <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Painel</span>
           </NavLink>
        )}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-on-surface-variant hover:text-error transition-colors"
        >
          <LogOut size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Sair</span>
        </button>
      </div>
    </nav>
  );
}
