import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { submissionService } from "../services/submissionService";
import { surveyService } from "../services/surveyService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, CheckCircle, Clock } from "lucide-react";
import { cn } from "../lib/utils";

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: history, isLoading } = useQuery({
    queryKey: ['submissions', 'history', selectedDate],
    queryFn: () => submissionService.getHistoryByDate(selectedDate)
  });

  const { data: surveys } = useQuery({
    queryKey: ['surveys_list'],
    queryFn: () => surveyService.getAll()
  });

  return (
    <div className="flex flex-col gap-6 py-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-1">Histórico</h2>
          <p className="text-slate-500 text-sm">Registro de atividades diárias</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-surface border border-outline rounded-xl px-4 py-2 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary-container outline-none shadow-sm transition-all"
        />
      </div>

      <div className="bg-surface border border-outline p-4 rounded-xl flex items-center justify-between tonal-card">
         <div className="flex items-center gap-3">
            <CalendarIcon size={20} className="text-primary" />
            <span className="font-bold text-on-surface">
              {format(new Date(selectedDate + 'T12:00:00'), "eeee, dd 'de' MMMM", { locale: ptBR })}
            </span>
         </div>
      </div>

      <div className="bg-primary-container dark:bg-primary/20 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg -mx-1">
         <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
         <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white brightness-125 mb-1 block">Pesquisas Realizadas em {format(new Date(selectedDate + 'T12:00:00'), 'dd/MM')}</span>
            <div className="flex items-baseline gap-2">
               <span className="text-5xl font-extrabold text-white">{history?.length || 0}</span>
               <span className="text-sm text-white font-bold">entrevistas</span>
            </div>
         </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Lista de Registros</h3>
           <button className="text-xs font-bold text-primary-container">Ver Tudo</button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
             [1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />)
          ) : history?.length === 0 ? (
             <div className="py-20 text-center text-on-surface-variant font-medium">Nenhuma pesquisa realizada hoje.</div>
          ) : (
            history?.map(item => {
              const survey = surveys?.find(srv => srv.id === item.formulario_id);
              
              return (
                <div key={item.id} className="bg-surface p-4 rounded-xl border border-outline flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-primary/5 dark:bg-primary/20 rounded-xl flex items-center justify-center">
                       <CheckCircle size={24} className={item.status_sincronizacao ? "text-primary" : "text-on-surface-variant/30"} />
                     </div>
                     <div>
                       <h4 className="font-bold text-sm text-on-surface leading-tight mb-1">{survey?.nome || "Pesquisa não identificada"}</h4>
                       <div className="flex flex-col gap-0.5">
                          <p className="text-[11px] text-on-surface-variant font-medium">Respondente: {item.nome_entrevistado}</p>
                          <div className="flex items-center gap-2">
                             <Clock size={12} className="text-on-surface-variant" />
                             <span className="text-[10px] text-on-surface-variant font-bold">{new Date(item.data_coleta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </div>
                     </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[9px] font-bold uppercase shadow-sm",
                    item.status_sincronizacao 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" 
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                  )}>
                    {item.status_sincronizacao ? "Sincronizado" : "Pendente"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
