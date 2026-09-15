import { motion } from "motion/react";
import { Award, Medal, Trophy } from "lucide-react";
import type { RankedResearcher } from "../../../hooks/useRankingData";
import { ResearcherAvatar } from "../../ResearcherAvatar";

function PositionIcon({ position }: { position: number }) {
  if (position === 1) return <Trophy size={24} className="text-yellow-400 drop-shadow-sm" />;
  if (position === 2) return <Medal size={24} className="text-slate-300 drop-shadow-sm" />;
  if (position === 3) return <Award size={24} className="text-amber-600 drop-shadow-sm" />;
  return <span className="w-6 shrink-0 text-center text-lg font-bold text-slate-400">{position}º</span>;
}

interface RankingRowProps {
  key?: string;
  researcher: RankedResearcher;
  position: number;
  maxCount: number;
  isAnimationActive: boolean;
}

export function RankingRow({ researcher, position, maxCount, isAnimationActive }: RankingRowProps) {
  const progress = (researcher.collectionCount / maxCount) * 100;
  const animationDelay = (position - 1) * 0.15;
  const progressClass = position === 1
    ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
    : position === 2
      ? "bg-gradient-to-r from-slate-300 to-slate-400"
      : position === 3
        ? "bg-gradient-to-r from-amber-600 to-amber-700"
        : "bg-gradient-to-r from-[#00B67A] to-emerald-400";

  return (
    <div className="group grid min-w-0 grid-cols-[40px_1fr_60px] items-center gap-2 px-4 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[80px_1fr_200px] md:gap-4 md:px-6 md:py-5">
      <div className="flex min-w-0 scale-75 justify-center md:scale-100" aria-label={`${position}ª posição`}>
        <PositionIcon position={position} />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <ResearcherAvatar name={researcher.nome} src={researcher.foto_avatar_url} className="h-8 w-8 shrink-0 rounded-lg bg-[#E6F8F2] text-sm font-bold text-[#00B67A] md:h-10 md:w-10 md:text-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#00B67A]">{researcher.nome}</p>
            <p className="flex min-w-0 items-center gap-1 truncate text-[10px] text-slate-500 md:gap-2 md:text-xs">
              <span className="min-w-0 truncate">{researcher.email}</span>
              <span className="hidden shrink-0 sm:inline">•</span>
              <span className="hidden shrink-0 font-mono sm:inline">{researcher.cpf || "-"}</span>
            </p>
          </div>
        </div>
        <div className="relative mt-3 h-1.5 min-w-0 overflow-hidden rounded-full bg-slate-100 md:h-2.5">
          <motion.div
            className={`absolute left-0 top-0 flex h-full min-w-0 justify-end overflow-hidden rounded-full ${progressClass}`}
            initial={{ width: 0 }}
            animate={{ width: isAnimationActive ? `${progress}%` : 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: animationDelay }}
          >
            {isAnimationActive && (
              <motion.span
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ["0%", "400%"] }}
                transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>
      </div>
      <motion.div
        className="flex min-w-0 flex-col items-end justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={isAnimationActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: animationDelay + 0.3 }}
      >
        <p className="text-xl font-black tracking-tighter text-slate-800 md:text-3xl">{researcher.collectionCount}</p>
        <p className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">Pesquisas</p>
      </motion.div>
    </div>
  );
}
