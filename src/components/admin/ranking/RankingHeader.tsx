import { ChevronDown, Filter } from "lucide-react";
import type { Survey } from "../../../types";

interface RankingHeaderProps {
  surveys?: Survey[];
  selectedSurveyId: string;
  isSurveysLoading: boolean;
  onSurveyChange: (surveyId: string) => void;
}

export function RankingHeader({
  surveys,
  selectedSurveyId,
  isSurveysLoading,
  onSurveyChange,
}: RankingHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-on-surface md:text-3xl">Ranking de Produtividade</h1>
        <p className="text-sm font-medium text-on-surface-variant md:text-base">Acompanhe o desempenho dos pesquisadores por pesquisa</p>
      </div>
      <div className="relative w-full md:w-[400px]">
        <select
          value={selectedSurveyId}
          onChange={event => onSurveyChange(event.target.value)}
          disabled={isSurveysLoading}
          className="w-full appearance-none rounded-2xl border border-outline bg-white py-3 pl-10 pr-10 text-sm font-bold shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70 dark:bg-slate-900"
        >
          <option value="">Selecionar Formulário...</option>
          {surveys?.map(survey => <option key={survey.id} value={survey.id}>{survey.nome}</option>)}
        </select>
        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={18} />
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
      </div>
    </div>
  );
}
