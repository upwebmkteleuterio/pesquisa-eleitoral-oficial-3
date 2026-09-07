import { useNavigate } from "react-router-dom";
import { CheckCircle, PlusCircle, LayoutList } from "lucide-react";

export default function SuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface dark:bg-slate-950 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-primary-container/5 rounded-full blur-[100px] scale-150" />
      
      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        <div className="w-40 h-40 bg-primary-container/10 rounded-full flex items-center justify-center mb-8">
           <div className="w-32 h-32 bg-primary-container rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle size={64} className="text-white" strokeWidth={3} />
           </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Pesquisa Concluída com Sucesso!</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-xs">Os dados foram salvos e estão prontos para sincronização.</p>

        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 flex items-center gap-4 mb-8 text-left">
           <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-primary-container" />
           </div>
           <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Local</span>
              <p className="font-bold text-slate-700 dark:text-slate-200">Salvo no Dispositivo</p>
           </div>
        </div>

        <div className="w-full space-y-3">
          <button 
            onClick={() => navigate('/')}
            className="w-full h-14 bg-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20"
          >
            <PlusCircle size={20} /> Iniciar Nova Pesquisa
          </button>
          <button 
            onClick={() => navigate('/history')}
            className="w-full h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <LayoutList size={20} /> Ver Histórico
          </button>
        </div>
      </div>
      
      <footer className="fixed bottom-8 text-slate-300 dark:text-slate-700 font-bold text-[10px] uppercase tracking-widest">
         ElectionSurvey Field v1.0.0
      </footer>
    </div>
  );
}
