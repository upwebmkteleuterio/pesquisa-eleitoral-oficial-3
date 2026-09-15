import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-outline px-6 py-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-2 rounded-xl border border-outline px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />Anterior
      </button>
      <span className="text-xs font-black text-on-surface-variant">Página {currentPage} de {totalPages}</span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-2 rounded-xl border border-outline px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
        aria-label="Próxima página"
      >
       Próxima<ChevronRight size={16} />
      </button>
    </div>
  );
}

export default Pagination;
