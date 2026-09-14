import { AnimatePresence, motion } from "motion/react";
import type { ReportMergeCardData, ReportMergeConfig } from "../../types";
import { ReportMergeCard } from "./ReportMergeCard";

interface ReportMergeListProps {
  cards: ReportMergeCardData[];
  isAdmin: boolean;
  deleteError: string | null;
  onEdit: (config: ReportMergeConfig) => void;
  onDelete: (config: ReportMergeConfig) => void;
}

export function ReportMergeList({ cards, isAdmin, deleteError, onEdit, onDelete }: ReportMergeListProps) {
  if (cards.length === 0 && !deleteError) return null;
  return <section className="space-y-5" aria-label="Mesclagens demográficas"><AnimatePresence mode="popLayout">{cards.map(card => <motion.div key={card.config.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}><ReportMergeCard card={card} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} /></motion.div>)}</AnimatePresence>{deleteError && <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{deleteError}</p>}</section>;
}
