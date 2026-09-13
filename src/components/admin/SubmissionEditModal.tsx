import { useEffect, useState, type FormEvent } from "react";
import { Save, Trash2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Submission, SubmissionEdits, DemographicOption, Survey } from "../../types";
import { SubmissionQuestionField } from "./SubmissionQuestionField";

interface SubmissionEditModalProps {
  isOpen: boolean;
  submission: Submission | null;
  survey?: Survey;
  demographicOptions?: DemographicOption[];
  isSaving: boolean;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (edits: SubmissionEdits) => void;
  onDelete: () => void;
}

const demographicFields = [
  ["sexo", "Sexo"],
  ["faixa_etaria", "Faixa etária"],
  ["escolaridade", "Escolaridade"],
  ["renda", "Renda"],
  ["religiao", "Religião"],
  ["estado_civil", "Estado civil"],
] as const;

export function SubmissionEditModal({ isOpen, submission, survey, demographicOptions, isSaving, isDeleting, error, onClose, onSave, onDelete }: SubmissionEditModalProps) {
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [phone, setPhone] = useState("");
  const [fixed, setFixed] = useState<Record<string, string>>({});
  const [dynamic, setDynamic] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!submission || !isOpen) return;
    setName(submission.nome_entrevistado || "");
    setNeighborhood(submission.bairro || "");
    setPhone(submission.telefone || "");
    setFixed({ ...(submission.dados_fixos || {}) });
    setDynamic(Object.fromEntries(Object.entries(submission.respostas_dinamicas || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])));
  }, [submission, isOpen]);

  if (!isOpen || !submission) return null;

  const updateFixed = (field: string, value: string) => setFixed(current => ({ ...current, [field]: value }));
  const updateDynamic = (id: string, value: any) => setDynamic(current => ({ ...current, [id]: value }));
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ nome_entrevistado: name, bairro: neighborhood, telefone: phone, dados_fixos: fixed, respostas_dinamicas: dynamic });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Fechar edição" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="submission-edit-title" className="relative flex h-full max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-outline bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-outline bg-white p-5 dark:bg-slate-900">
          <div>
            <h2 id="submission-edit-title" className="text-xl font-black text-on-surface">Editar resposta</h2>
            <p className="mt-1 text-xs font-bold text-on-surface-variant">Atualize os dados fixos e as respostas da pesquisa.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Fechar edição" className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"><X size={22} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Dados do respondente</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-black uppercase text-on-surface-variant">Nome</span><input value={name} onChange={event => setName(event.target.value)} disabled={isSaving} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800" /></label>
              <label className="space-y-1.5"><span className="text-xs font-black uppercase text-on-surface-variant">Bairro</span><input value={neighborhood} onChange={event => setNeighborhood(event.target.value)} disabled={isSaving} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800" /></label>
              <label className="space-y-1.5"><span className="text-xs font-black uppercase text-on-surface-variant">Telefone</span><input value={phone} onChange={event => setPhone(event.target.value)} disabled={isSaving} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800" /></label>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Dados demográficos</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {demographicFields.map(([field, label]) => (
                <label key={field} className="space-y-1.5"><span className="text-xs font-black uppercase text-on-surface-variant">{label}</span><select value={fixed[field] || ""} onChange={event => updateFixed(field, event.target.value)} disabled={isSaving} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800"><option value="">Não informado</option>{demographicOptions?.filter(option => option.categoria === field).map(option => <option key={option.id} value={option.valor}>{option.label}</option>)}</select></label>
              ))}
            </div>
          </section>

          {survey?.schema_dinamico?.questions?.length > 0 && <section className="space-y-4"><h3 className="text-sm font-black uppercase tracking-widest text-primary">Perguntas da pesquisa</h3>{survey.schema_dinamico.questions.map((question: any) => <div key={question.id} className="space-y-2 rounded-2xl border border-outline p-4"><label className="block text-sm font-black text-on-surface">{question.label}</label><SubmissionQuestionField question={question} value={dynamic[question.id]} onChange={value => updateDynamic(question.id, value)} disabled={isSaving} /></div>)}</section>}
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-outline bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900">
          <button type="button" onClick={onDelete} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-3 font-black text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"><Trash2 size={18} />{isDeleting ? "Excluindo..." : "Excluir resposta"}</button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-outline px-5 py-3 font-black text-on-surface-variant hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">Cancelar</button>
            <button type="submit" disabled={isSaving} className={cn("inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-black text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50")}><Save size={18} />{isSaving ? "Salvando..." : "Salvar alteração"}</button>
          </div>
        </footer>
      </form>
    </div>
  );
}
