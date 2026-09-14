import { FileDown, GitMerge } from "lucide-react";

interface ReportMergeActionsProps {
  isAdmin: boolean;
  canExport: boolean;
  onCreate: () => void;
  onExport: () => void;
}

export function ReportMergeActions({ isAdmin, canExport, onCreate, onExport }: ReportMergeActionsProps) {
  return <div className="flex flex-wrap items-center gap-3">{isAdmin && <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white shadow-lg shadow-primary/20 transition hover:brightness-110"><GitMerge size={20} />Mesclar dados</button>}<button type="button" onClick={onExport} disabled={!canExport} className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"><FileDown size={20} />Exportar mesclagens</button></div>;
}
