import { ChevronDown, Download, Filter, LoaderCircle } from "lucide-react";
import type { Survey } from "../../../types";

interface RankingHeaderProps {
  surveys?: Survey[];
  selectedSurveyId: string;
  isSurveysLoading: boolean;
  canExport: boolean;
  isExporting: boolean;
  onSurveyChange: (surveyId: string) => void;
  onExport: () => void;
}

export function RankingHeader({
  surveys,
  selectedSurveyId,
  isSurveysLoading,
  canExport,
  isExporting,
  onSurveyChange,
  onExport,
}: RankingHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-on-surface md:text-3xl">Ranking de Produtividade</h1>
        <p className="text-sm font-medium text-on-surface-variant md:text-base">Acompanhe o desempenho dos pesquisadores por pesquisa</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
        <div className="relative min-w-0 flex-1 sm:min-w-[280px] md:w-[320px] md:flex-none">
          <select
            value={selectedSurveyId}
            onChange={event => onSurveyChange(event.target.value)}
            disabled={isSurveysLoading}
            aria-label="Selecionar pesquisa do ranking"
            className="w-full appearance-none rounded-2xl border border-outline bg-white py-3 pl-10 pr-10 text-sm font-bold shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70 dark:bg-slate-900"
          >
            <option value="">Selecionar Formulário...</option>
            {surveys?.map(survey => <option key={survey.id} value={survey.id}>{survey.nome}</option>)}
          </select>
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={18} />
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport || isExporting}
          aria-busy={isExporting}
          aria-label={isExporting ? "Gerando PDF do ranking" : "Baixar ranking em PDF"}
          title={isExporting ? "Gerando PDF..." : "Baixar ranking em PDF"}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isExporting ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
          <span>{isExporting ? "Gerando PDF..." : "Baixar PDF"}</span>
        </button>
      </div>
    </div>
  );
}
