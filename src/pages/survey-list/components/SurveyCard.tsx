import { MapPin, PlayCircle, CloudOff, CloudCheck, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { submissionService } from "../../../services/submissionService";
import { cn } from "../../../lib/utils";
import { Survey, Region } from "../../../types";
import { useState, useEffect } from "react";
import localforage from "localforage";

interface SurveyCardProps {
  survey: Survey;
  regions?: Region[];
}

export function SurveyCard({ survey, regions }: SurveyCardProps) {
  const navigate = useNavigate();
  const [isCached, setIsCached] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { data: submissionCount = 0 } = useQuery({
    queryKey: ['submission-count', 'survey-card', survey.id],
    queryFn: () => submissionService.getBySurveyIdCount(survey.id, false),
    staleTime: 1000 * 60 * 5 // 5 minutos em cache
  });

  useEffect(() => {
    const checkCache = async () => {
      const detail = await localforage.getItem(`survey_detail_${survey.id}`);
      setIsCached(!!detail);
    };
    checkCache();

    const handleNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleNetwork);
    window.addEventListener('offline', handleNetwork);
    return () => {
      window.removeEventListener('online', handleNetwork);
      window.removeEventListener('offline', handleNetwork);
    };
  }, [survey.id]);

  const count = submissionCount;
  const progress = (count / survey.limite_total) * 100;
  const isUrgent = progress > 90 && progress < 100;
  const isCompleted = progress >= 100;

  return (
    <div 
      onClick={() => navigate(`/survey/${survey.id}`)}
      className="bg-surface tonal-card rounded-xl p-5 flex flex-col gap-4 border border-outline transition-transform active:scale-[0.98] cursor-pointer shadow-sm relative overflow-hidden"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-primary font-bold text-xs uppercase tracking-wider">
            <MapPin size={14} />
            <span>Região: {regions?.find(r => r.id === survey.regiao_id)?.cidade || 'Não informada'}</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface leading-tight">{survey.nome}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
            isCompleted 
              ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" 
              : isUrgent 
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500" 
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
          )}>
            {isCompleted ? "Concluída" : isUrgent ? "Urgente" : "Ativa"}
          </div>
          
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border",
            isCached 
              ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800" 
              : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
          )}>
            {isCached ? <CloudCheck size={12} /> : <CloudOff size={12} />}
            {isCached ? "Disponível Offline" : "Apenas Online"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="text-sm font-semibold text-on-surface-variant">Progresso da Cota</span>
          <span className="text-sm font-bold text-on-surface">{count} / {survey.limite_total}</span>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", isCompleted ? "bg-slate-400" : isUrgent ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${Math.min(progress, 100)}%` }} 
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-on-surface-variant font-medium">
            {isCompleted ? "Cota total atingida" : `Faltam ${Math.max(0, survey.limite_total - count)} entrevistas`}
          </span>
          {!isOnline && !isCached && (
            <span className="text-[10px] text-error font-black uppercase animate-pulse">Requer Internet</span>
          )}
        </div>
      </div>

      {!isCompleted && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (!isOnline && !isCached) {
              alert("Esta pesquisa ainda não foi baixada para uso offline. Conecte-se à internet para iniciar.");
              return;
            }
            navigate(`/collection/${survey.id}`);
          }}
          disabled={!isOnline && !isCached}
          className={cn(
            "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-extrabold shadow-lg active:scale-[0.98] transition-all uppercase tracking-tight",
            (!isOnline && !isCached) 
              ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
              : "bg-primary text-white shadow-primary/30"
          )}
        >
          <PlayCircle size={24} fill="currentColor" className={(!isOnline && !isCached) ? "text-slate-400" : "text-white/20"} stroke="white" />
          {(!isOnline && !isCached) ? "Indisponível Offline" : "Iniciar Coleta"}
        </button>
      )}
    </div>
  );
}