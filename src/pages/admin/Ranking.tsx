import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronDown, Database, Filter, Medal, Trophy, Award } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { submissionService } from "../../services/submissionService";
import { surveyService } from "../../services/surveyService";
import { userService } from "../../services/userService";
import type { Researcher, Submission, Survey } from "../../types";

interface RankedResearcher extends Researcher {
  collectionCount: number;
}

function PositionIcon({ position }: { position: number }) {
  if (position === 1) return <Trophy size={24} className="text-yellow-400 drop-shadow-sm" />;
  if (position === 2) return <Medal size={24} className="text-slate-300 drop-shadow-sm" />;
  if (position === 3) return <Award size={24} className="text-amber-600 drop-shadow-sm" />;
  return <span className="w-6 text-center text-lg font-bold text-slate-400">{position}º</span>;
}

function RankingRow({ researcher, position, maxCount, isAnimationActive }: {
  key?: string;
  researcher: RankedResearcher;
  position: number;
  maxCount: number;
  isAnimationActive: boolean;
}) {
  const progress = (researcher.collectionCount / maxCount) * 100;
  const initial = researcher.nome.trim().charAt(0).toUpperCase() || "?";
  const animationDelay = (position - 1) * 0.15;
  const progressClass = position === 1
    ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
    : position === 2
      ? "bg-gradient-to-r from-slate-300 to-slate-400"
      : position === 3
        ? "bg-gradient-to-r from-amber-600 to-amber-700"
        : "bg-gradient-to-r from-[#00B67A] to-emerald-400";

  return (
    <div className="group grid grid-cols-[80px_1fr_200px] items-center gap-4 px-6 py-5 transition-colors hover:bg-slate-50">
      <div className="flex justify-center" aria-label={`${position}ª posição`}>
        <PositionIcon position={position} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F8F2] text-lg font-bold text-[#00B67A]">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#00B67A]">{researcher.nome}</p>
            <p className="flex min-w-0 items-center gap-2 truncate text-xs text-slate-500">
              <span className="truncate">{researcher.email}</span>
              <span>•</span>
              <span className="font-mono">{researcher.cpf || "-"}</span>
            </p>
          </div>
        </div>
        <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={`absolute left-0 top-0 flex h-full justify-end overflow-hidden rounded-full ${progressClass}`}
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
        className="flex flex-col items-end justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={isAnimationActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: animationDelay + 0.3 }}
      >
        <p className="text-3xl font-black tracking-tighter text-slate-800">{researcher.collectionCount}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pesquisas</p>
      </motion.div>
    </div>
  );
}

function RankingEmptyState({ hasSelection }: { hasSelection: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 px-10 py-32 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 dark:bg-slate-800">
        <Database size={40} />
      </div>
      <div className="mx-auto max-w-sm">
        <p className="text-lg font-bold text-on-surface">
          {hasSelection ? "Nenhum pesquisador participante" : "Nenhuma pesquisa selecionada"}
        </p>
        <p className="mt-1 text-sm font-medium text-on-surface-variant">
          {hasSelection
            ? "Esta pesquisa ainda não possui coletas atribuídas a pesquisadores."
            : "Escolha uma pesquisa no menu acima para visualizar o ranking."}
        </p>
      </div>
    </div>
  );
}

function RankingList({ ranking, isAnimationActive }: { ranking: RankedResearcher[]; isAnimationActive: boolean }) {
  const maxCount = ranking[0]?.collectionCount || 1;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[80px_1fr_200px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span className="text-center">Posição</span>
          <span>Pesquisador &amp; Progresso</span>
          <span className="text-right">Coletas Realizadas</span>
        </div>
        <div className="divide-y divide-slate-100">
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
    </div>
  );
}

export default function Ranking() {
  const { user, profile } = useAuth();
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [isAnimationActive, setIsAnimationActive] = useState(false);

  const { data: surveys, isLoading: isSurveysLoading } = useQuery<Survey[]>({
    queryKey: ["admin_surveys", user?.id || "anonymous", profile?.role || "unknown"],
    queryFn: () => surveyService.getAllForUser(user?.id, profile?.role),
    enabled: !!user && profile?.role === "admin",
  });
  const { data: researchers, isLoading: isResearchersLoading } = useQuery<Researcher[]>({
    queryKey: ["all_researchers", user?.id || "anonymous"],
    queryFn: () => userService.getAllResearchers(),
    enabled: !!user && profile?.role === "admin",
  });
  const { data: submissions, isLoading: isSubmissionsLoading, isFetching: isSubmissionsFetching } = useQuery<Submission[]>({
    queryKey: ["submissions", "ranking", user?.id || "anonymous", selectedSurveyId],
    queryFn: () => submissionService.getBySurveyId(selectedSurveyId, true, undefined, false),
    enabled: !!selectedSurveyId && !!user && profile?.role === "admin",
  });

  useEffect(() => {
    setIsAnimationActive(false);
    if (!selectedSurveyId) return;
    const timeoutId = window.setTimeout(() => setIsAnimationActive(true), 100);
    return () => window.clearTimeout(timeoutId);
  }, [selectedSurveyId]);

  const ranking = useMemo<RankedResearcher[]>(() => {
    if (!researchers || !submissions) return [];
    const counts = new Map<string, number>();
    submissions.filter(submission => submission.valida !== false).forEach(submission => {
      const responsibleId = submission.origem === "web" ? submission.referenciado_por : submission.pesquisador_id;
      if (responsibleId) counts.set(responsibleId, (counts.get(responsibleId) || 0) + 1);
    });

    return researchers
      .map(researcher => ({ ...researcher, collectionCount: counts.get(researcher.id) || 0 }))
      .filter(researcher => researcher.collectionCount > 0)
      .sort((left, right) => right.collectionCount - left.collectionCount || left.nome.localeCompare(right.nome));
  }, [researchers, submissions]);

  const isLoading = isSurveysLoading || isResearchersLoading || (!!selectedSurveyId && (isSubmissionsLoading || isSubmissionsFetching));
  const hasSelection = !!selectedSurveyId;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">Ranking de Produtividade</h1>
          <p className="font-medium text-on-surface-variant">Acompanhe o desempenho dos pesquisadores por pesquisa</p>
        </div>
        <div className="relative min-w-[320px]">
          <select
            value={selectedSurveyId}
            onChange={event => setSelectedSurveyId(event.target.value)}
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
