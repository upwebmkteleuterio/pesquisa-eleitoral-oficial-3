import { useEffect, useState } from "react";
import { X, FileDown } from "lucide-react";
import { Researcher } from "../../types";

interface ResponsePdfModalProps {
  isOpen: boolean;
  members: Researcher[];
  validCount: number;
  validCountsByMember: Record<string, number>;
  onClose: () => void;
  onGenerate: (memberId: string) => void;
}

export function ResponsePdfModal({ isOpen, members, validCount, validCountsByMember, onClose, onGenerate }: ResponsePdfModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState("todos");
  const selectedValidCount = selectedMemberId === "todos" ? validCount : validCountsByMember[selectedMemberId] || 0;

  useEffect(() => {
    if (isOpen) setSelectedMemberId("todos");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="response-pdf-title">
      <button type="button" aria-label="Fechar janela" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-[2.5rem] border border-outline bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileDown size={24} /></div>
            <h2 id="response-pdf-title" className="text-2xl font-black tracking-tight text-on-surface">Gerar PDF de respostas</h2>
            <p className="mt-1 text-sm font-medium text-on-surface-variant">Escolha todos os membros ou um responsável.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar"><X size={20} /></button>
        </div>

        <label htmlFor="response-pdf-member" className="mb-2 block text-xs font-black uppercase tracking-widest text-on-surface-variant">Membro/pesquisador</label>
        <select id="response-pdf-member" value={selectedMemberId} onChange={event => setSelectedMemberId(event.target.value)} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-primary dark:bg-slate-800">
          <option value="todos">Todos os membros</option>
          {members.map(member => <option key={member.id} value={member.id}>{member.nome}{member.role === "admin" ? " (Adm)" : ""}</option>)}
        </select>
        <p className="mt-3 text-xs font-medium text-on-surface-variant">{selectedValidCount} resposta{selectedValidCount === 1 ? " válida" : "s válidas"} disponível{selectedValidCount === 1 ? "" : "is"} para esta seleção.</p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-on-surface-variant transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">Cancelar</button>
          <button type="button" disabled={selectedValidCount === 0} onClick={() => onGenerate(selectedMemberId)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><FileDown size={18} />Gerar PDF</button>
        </div>
      </div>
    </div>
  );
}
