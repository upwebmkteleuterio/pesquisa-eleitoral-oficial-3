import { RefreshCw, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { useSurveyList } from "./survey-list/hooks/useSurveyList";
import { SurveyCard } from "./survey-list/components/SurveyCard";

export default function SurveyList() {
  const {
    activeFilter,
    setActiveFilter,
    regions,
    isLoading,
    isError,
    retry,
    filteredSurveys
  } = useSurveyList();

  if (isLoading) {
    return (
      <div className="p-gutter flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-medium text-on-surface-variant">Não foi possível carregar as pesquisas. Verifique sua conexão ou tente novamente.</p>
        <button type="button" onClick={() => retry()} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white">
          <RefreshCw size={18} /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col -mx-5 px-5">
      <div className="bg-primary pt-8 pb-8 -mx-5 px-5 rounded-b-[24px] shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-white">Minhas Pesquisas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por cidade ou nome..."
              className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {["Ativas", "Concluídas", "Todas"].map((filterName) => (
              <button 
                key={filterName}
                onClick={() => setActiveFilter(filterName)}
                className={cn(
                  "whitespace-nowrap px-6 py-2 rounded-full font-semibold text-sm transition-all",
                  activeFilter === filterName ? "bg-white text-primary" : "bg-white/10 text-white border border-white/20"
                )}
              >
                {filterName}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-10">
        {filteredSurveys?.length === 0 ? (
          <div className="py-20 text-center text-slate-400">Nenhuma pesquisa encontrada para este filtro.</div>
        ) : filteredSurveys?.map((survey) => (
          <div key={survey.id}>
            <SurveyCard survey={survey} regions={regions} />
          </div>
        ))}
      </div>
    </div>
  );
}
