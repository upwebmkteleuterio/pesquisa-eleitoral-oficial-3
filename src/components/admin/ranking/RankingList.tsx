import type { RankedResearcher } from "../../../hooks/useRankingData";
import { RankingRow } from "./RankingRow";

interface RankingListProps {
  ranking: RankedResearcher[];
  isAnimationActive: boolean;
}

export function RankingList({ ranking, isAnimationActive }: RankingListProps) {
  const maxCount = ranking[0]?.collectionCount || 1;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid min-w-0 grid-cols-[40px_1fr_60px] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid-cols-[80px_1fr_200px] md:gap-4 md:px-6 md:py-5">
        <span className="min-w-0 text-center"><span className="md:hidden">Pos</span><span className="hidden md:inline">Posição</span></span>
        <span className="min-w-0 truncate">Pesquisador <span className="hidden md:inline">&amp; Progresso</span></span>
        <span className="min-w-0 text-right"><span className="md:hidden">Coletas</span><span className="hidden md:inline">Coletas Realizadas</span></span>
      </div>
      <div className="min-w-0 divide-y divide-slate-100">
        {ranking.map((researcher, index) => (
          <RankingRow
            key={researcher.id}
            researcher={researcher}
            position={index + 1}
            maxCount={maxCount}
            isAnimationActive={isAnimationActive}
          />
        ))}
      </div>
    </div>
  );
}
