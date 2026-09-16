import { useEffect, useState, type FormEvent } from "react";
import { Check, Save, Trash2, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  mode: "save" | "delete";
  configName?: string;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (name?: string) => void;
}

export function VirtualReportConfigModal({ isOpen, mode, configName = "", isSubmitting, error, onClose, onConfirm }: Props) {
  const [name, setName] = useState(configName);

  useEffect(() => {
    if (isOpen) setName(configName);
  }, [configName, isOpen]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "delete") onConfirm();
    else if (name.trim()) onConfirm(name.trim());
  };

  if (!isOpen) return null;
  const deleting = mode === "delete";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" aria-label="Fechar modal" />
      <form onSubmit={submit} className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="virtual-config-title">
        <div className="flex items-start justify-between gap-4 border-b border-outline p-6"><div className="flex items-center gap-3"><div className={deleting ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"}>{deleting ? <Trash2 size={22} /> : <Save size={22} />}</div><div><h2 id="virtual-config-title" className="text-xl font-black text-on-surface">{deleting ? "Excluir configuração" : "Salvar configuração"}</h2><p className="mt-1 text-xs font-bold text-on-surface-variant">{deleting ? `A configuração “${configName}” será excluída.` : "Dê um nome para reutilizar este relatório virtual."}</p></div></div><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar"><X size={20} /></button></div>
        {!deleting && <div className="p-6"><label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Nome da configuração</span><input autoFocus value={name} onChange={event => setName(event.target.value)} maxLength={120} disabled={isSubmitting} className="w-full rounded-2xl border-2 border-outline bg-slate-50 px-4 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800" placeholder="Ex.: Intenção de voto - regiões" /></label></div>}
        {error && <p className="mx-6 mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-outline p-6 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-2xl border border-outline px-5 py-3 font-black text-on-surface-variant">Cancelar</button><button type="submit" disabled={isSubmitting || (!deleting && !name.trim())} className={deleting ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white disabled:opacity-40" : "inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-black text-white disabled:opacity-40"}>{deleting ? <Trash2 size={18} /> : <Check size={18} />}{deleting ? "Excluir configuração" : "Confirmar salvamento"}</button></div>
      </form>
    </div>
  );
}
