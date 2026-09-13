import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { submissionService } from "../services/submissionService";
import { surveyService } from "../services/surveyService";
import { RefreshCw, CloudUpload, CheckCircle, AlertCircle, WifiOff, FileText, Calendar, Clock } from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";

export default function SyncPage() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { data: submissions } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: () => submissionService.getAll()
  });

  const { data: surveys } = useQuery({
    queryKey: ['surveys_list'],
    queryFn: () => surveyService.getAll()
  });

  const pendingSubmissions = submissions?.filter(s => !s.status_sincronizacao) || [];
  const pendingCount = pendingSubmissions.length;

  const syncMutation = useMutation({
    mutationFn: () => submissionService.syncAll(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['submissions'] });
    }
  });

  const syncResult = syncMutation.data;
  const syncMessage = syncMutation.isError
    ? "Não foi possível sincronizar. As pesquisas continuam pendentes para nova tentativa."
    : syncResult && syncResult.failureCount === 0
      ? `Sincronização concluída: ${syncResult.successCount} pesquisa(s) sincronizada(s) e 0 falharam.`
      : syncResult && syncResult.successCount > 0
        ? `Sincronização parcial: ${syncResult.successCount} pesquisa(s) sincronizada(s) e ${syncResult.failureCount} pesquisa(s) falharam. As falhas continuam pendentes.`
        : syncResult
          ? `Não foi possível sincronizar: ${syncResult.failureCount} pesquisa(s) falharam e continuam pendentes.`
          : null;

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 py-5">
      <div className="flex items-center justify-between bg-surface border border-outline p-5 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-on-surface">Status da Conexão</h2>
        <div className={cn(
          "px-4 py-1.5 rounded-full flex items-center gap-2 font-bold text-xs shadow-sm",
          isOnline 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" 
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
        )}>
          <div className={cn("w-2 h-2 rounded-full shadow-sm", isOnline ? "bg-green-500" : "bg-red-500 animate-pulse")} />
          {isOnline ? "Conectado" : "Offline"}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-outline p-10 flex flex-col items-center text-center shadow-sm">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-primary/20">
           <CloudUpload size={48} />
        </div>
        <h3 className="text-4xl font-bold mb-2 text-on-surface">{pendingCount}</h3>
        <p className="text-on-surface-variant mb-8 max-w-[200px] font-medium">Pesquisas pendentes para sincronização</p>
        
        <button
          onClick={() => syncMutation.mutate()}
          disabled={pendingCount === 0 || syncMutation.isPending || !isOnline}
          className="w-full bg-primary text-white h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
        >
          <RefreshCw size={20} className={cn(syncMutation.isPending && "animate-spin")} />
          {syncMutation.isPending ? "Sincronizando..." : "Sincronizar Agora"}
        </button>

        {!syncMutation.isPending && syncMessage && (
          <div
            role="status"
            className={cn(
              "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              syncMutation.isError || (syncResult?.failureCount ?? 0) > 0
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            )}
          >
            {syncMutation.isError || (syncResult?.failureCount ?? 0) > 0
              ? <AlertCircle size={18} className="mt-0.5 shrink-0" />
              : <CheckCircle size={18} className="mt-0.5 shrink-0" />}
            <span>{syncMessage}</span>
          </div>
        )}
        
        {!isOnline && (
           <p className="mt-4 text-xs text-red-500 flex items-center gap-1">
             <WifiOff size={12} /> Conecte-se à internet para sincronizar
           </p>
        )}
      </div>

      <section>
        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Aguardando Sincronização</h3>
        <div className="space-y-3">
          {pendingCount === 0 ? (
            <div className="py-10 text-center text-slate-400 font-medium bg-surface rounded-xl border border-dashed border-outline">
              Tudo sincronizado! Nenhuma pendência encontrada.
            </div>
          ) : (
            pendingSubmissions.map(s => {
              const survey = surveys?.find(srv => srv.id === s.formulario_id);
              const collectionDate = new Date(s.data_coleta);
              
              return (
                <div key={s.id} className="bg-surface p-4 rounded-xl border border-outline flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-on-surface truncate max-w-[180px]">{survey?.nome || "Pesquisa não identificada"}</h4>
                        <p className="text-[11px] text-on-surface-variant font-medium">Respondente: {s.nome_entrevistado}</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase rounded-md border border-amber-100">
                      Pendente
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant border-t border-outline pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-primary" />
                      <span>{collectionDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-primary" />
                      <span>{collectionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
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
