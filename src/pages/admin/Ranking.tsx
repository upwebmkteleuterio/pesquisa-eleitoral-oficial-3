import { useEffect, useState } from "react";
import { RankingEmptyState } from "../../components/admin/ranking/RankingEmptyState";
import { RankingHeader } from "../../components/admin/ranking/RankingHeader";
import { RankingList } from "../../components/admin/ranking/RankingList";
import { useRankingData } from "../../hooks/useRankingData";

export default function Ranking() {
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [isAnimationActive, setIsAnimationActive] = useState(false);
  const { surveys, ranking, isLoading, isSurveysLoading } = useRankingData(selectedSurveyId);
  const hasSelection = !!selectedSurveyId;

  useEffect(() => {
    setIsAnimationActive(false);
    if (!selectedSurveyId) return;
    const timeoutId = window.setTimeout(() => setIsAnimationActive(true), 100);
    return () => window.clearTimeout(timeoutId);
  }, [selectedSurveyId]);

  return (
    <div className="animate-in space-y-4 fade-in duration-500 md:space-y-6">
      <RankingHeader
        surveys={surveys}
        selectedSurveyId={selectedSurveyId}
        isSurveysLoading={isSurveysLoading}
        onSurveyChange={setSelectedSurveyId}
      />

      {isLoading && hasSelection ? (
        <div className="overflow-hidden rounded-3xl border border-outline bg-white shadow-sm dark:bg-slate-900">
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs font-black uppercase tracking-widest text-primary">Carregando ranking...</p>
          </div>
        </div>
      ) : !hasSelection ? (
        <div className="overflow-hidden rounded-3xl border border-outline bg-white shadow-sm dark:bg-slate-900">
          <RankingEmptyState hasSelection={false} />
        </div>
      ) : ranking.length === 0 ? (
        <div className="overflow-hidden rounded-3xl border border-outline bg-white shadow-sm dark:bg-slate-900">
          <RankingEmptyState hasSelection />
        </div>
      ) : (
        <RankingList ranking={ranking} isAnimationActive={isAnimationActive} />
      )}
    </div>
  );
}
