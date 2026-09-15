import { Database } from "lucide-react";

export function RankingEmptyState({ hasSelection }: { hasSelection: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center md:p-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300 md:h-16 md:w-16 dark:bg-slate-800">
        <Database className="h-6 w-6 md:h-8 md:w-8" />
      </div>
      <div className="mx-auto min-w-0 max-w-sm">
        <p className="text-base font-bold text-on-surface md:text-lg">
          {hasSelection ? "Nenhum pesquisador participante" : "Nenhuma pesquisa selecionada"}
        </p>
        <p className="mt-1 text-sm font-medium text-on-surface-variant md:text-base">
          {hasSelection
            ? "Esta pesquisa ainda não possui coletas atribuídas a pesquisadores."
            : "Escolha uma pesquisa no menu acima para visualizar o ranking."}
        </p>
      </div>
    </div>
  );
}
