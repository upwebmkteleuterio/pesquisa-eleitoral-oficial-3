import { useState, useMemo, useEffect, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../../services/surveyService";
import { submissionService } from "../../services/submissionService";
import { userService } from "../../services/userService";
import { exportSubmissions } from "../../utils/exportUtils";
import { generateRespondentsPDF, generateResponsesPDF } from "../../utils/pdfUtils";
import type { ResponsePdfType } from "../../components/admin/ResponsePdfModal";
import { ExportModal } from "../../components/admin/ExportModal";
import { ResponsePdfModal } from "../../components/admin/ResponsePdfModal";
import { SubmissionEditModal } from "../../components/admin/SubmissionEditModal";
import { AudioPlaybackModal } from "../../components/admin/AudioPlaybackModal";
import Pagination from "../../components/Pagination";
import { Submission, SubmissionEdits } from "../../types";
import type { SubmissionPage } from "../../services/submissionService";
import { FileSpreadsheet, FileDown, ChevronDown, Filter, Database, Calendar, Clock, User, Globe, Smartphone, UserPlus, Lightbulb, PlayCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { researcherDirectoryService, indexResearcherDirectory } from "../../services/researcherDirectoryService";
import { ResearcherAvatar } from "../../components/ResearcherAvatar";

export default function SubmissionsList() {
  const { user, profile } = useAuth();
  const isClient = profile?.role === 'cliente';
  const canPlayAudio = profile?.role === 'admin' || isClient;
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [selectedResearcherId, setSelectedResearcherId] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isResponsePdfModalOpen, setIsResponsePdfModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [audioSubmission, setAudioSubmission] = useState<Submission | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const submissionQueryKey = ['submissions', 'list', user?.id || 'anonymous', selectedSurveyId, selectedResearcherId, page];
  const { data: surveys } = useQuery({
    queryKey: ['admin_surveys', user?.id || 'anonymous', profile?.role || 'unknown'],
    queryFn: () => surveyService.getAllForUser(user?.id, profile?.role),
    enabled: !!user,
  });
  const { data: allUsers } = useQuery({ queryKey: ['all_users', user?.id || 'anonymous'], queryFn: () => userService.getAllUsers(), enabled: !isClient && !!user });
  const { data: demographicOptions } = useQuery({ queryKey: ['demographic_options_list'], queryFn: () => surveyService.getDemographicOptions() });
  const { data: submissionsPage, isLoading } = useQuery<SubmissionPage>({
    queryKey: submissionQueryKey,
    queryFn: () => submissionService.getBySurveyIdPaged(selectedSurveyId, page, isClient, isClient ? user?.id : undefined, isClient, selectedResearcherId),
    enabled: !!selectedSurveyId && (!isClient || surveys?.some(survey => survey.id === selectedSurveyId)),
  });
  const submissions = submissionsPage?.data;
  const responsibleIds = useMemo(() => [...new Set((submissions || []).map(submission => (submission.origem === "web" ? submission.referenciado_por : submission.pesquisador_id)).filter((id): id is string => Boolean(id)))], [submissions]);
  const { data: publicDirectory = [] } = useQuery({
    queryKey: ["public_researchers", user?.id || "anonymous", responsibleIds.join(",")],
    queryFn: () => researcherDirectoryService.getByIds(responsibleIds),
    enabled: isClient && responsibleIds.length > 0,
  });
  const publicDirectoryById = useMemo(() => indexResearcherDirectory(publicDirectory), [publicDirectory]);
  const totalSubmissions = submissionsPage?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalSubmissions / 50));
  const { data: validSubmissionCount = 0 } = useQuery({
    queryKey: ['submissions', 'count', user?.id || 'anonymous', selectedSurveyId, selectedResearcherId, 'valid'],
    queryFn: () => submissionService.getBySurveyIdCount(selectedSurveyId, true, isClient ? user?.id : undefined, isClient, selectedResearcherId),
    enabled: !!selectedSurveyId && (!isClient || surveys?.some(survey => survey.id === selectedSurveyId)),
  });
  const { data: completeSubmissions = [] } = useQuery({
    queryKey: ['submissions', 'export', user?.id || 'anonymous', selectedSurveyId, selectedResearcherId],
    queryFn: () => submissionService.getBySurveyIdFiltered(selectedSurveyId, isClient, isClient ? user?.id : undefined, isClient, selectedResearcherId),
    enabled: isResponsePdfModalOpen && !!selectedSurveyId,
  });

  useEffect(() => {
    if (!isClient || !surveys) return;
    setSelectedSurveyId(currentId => surveys.some(survey => survey.id === currentId) ? currentId : surveys[0]?.id || "");
  }, [isClient, surveys]);

  useEffect(() => {
    setPage(1);
  }, [selectedSurveyId, selectedResearcherId]);

  const validationMutation = useMutation({
    mutationFn: ({ id, valida }: { id: string; valida: boolean }) => submissionService.updateValidation(id, valida),
    onSuccess: (updated) => {
      queryClient.setQueryData<SubmissionPage>(submissionQueryKey, current => current ? { ...current, data: current.data.map(submission => submission.id === updated.id ? updated : submission) } : current);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setValidationError(null);
    },
    onError: () => setValidationError("Não foi possível atualizar a validade da resposta.")
  });

  const editMutation = useMutation({
    mutationFn: ({ id, edits }: { id: string; edits: SubmissionEdits }) => submissionService.updateById(id, edits),
    onSuccess: (updated) => {
      queryClient.setQueryData<SubmissionPage>(submissionQueryKey, current => current ? { ...current, data: current.data.map(submission => submission.id === updated.id ? updated : submission) } : current);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmission(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (submission: Submission) => submissionService.deleteById(submission.id, submission.audio?.storage_path),
    onSuccess: (_, deletedSubmission) => {
      queryClient.setQueryData<SubmissionPage>(submissionQueryKey, current => current ? { ...current, data: current.data.filter(submission => submission.id !== deletedSubmission.id), total: Math.max(0, current.total - 1) } : current);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmission(null);
    }
  });

  const selectedSurvey = useMemo(() => surveys?.find(s => s.id === selectedSurveyId), [surveys, selectedSurveyId]);
  const dynamicColumns = useMemo(() => selectedSurvey?.schema_dinamico?.questions || [], [selectedSurvey]);
  const filteredSubmissions = submissions || [];
  const validCountsByMember = useMemo(() => {
    const counts: Record<string, number> = {};
    completeSubmissions.filter(submission => submission.valida !== false).forEach(submission => {
      const memberId = (submission.origem === "web" ? submission.referenciado_por : submission.pesquisador_id) || "sistema";
      counts[memberId] = (counts[memberId] || 0) + 1;
    });
    return counts;
  }, [completeSubmissions]);

  const handleExport = async (formatType: 'xlsx' | 'csv') => {
    if (!selectedSurvey) return;
    setIsExporting(true);
    try {
      const complete = await submissionService.getBySurveyIdFiltered(selectedSurveyId, isClient, isClient ? user?.id : undefined, isClient, selectedResearcherId);
      if (!complete.length) return;
      exportSubmissions(complete, selectedSurvey.nome, allUsers || [], demographicOptions || [], dynamicColumns, formatType);
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateResponsesPDF = async (memberId: string, pdfType: ResponsePdfType) => {
    if (!selectedSurvey || !completeSubmissions.length || validSubmissionCount === 0 || (memberId !== "todos" && !validCountsByMember[memberId])) return;
    if (pdfType === "respondents") {
      await generateRespondentsPDF(selectedSurvey, completeSubmissions, memberId);
    } else {
      await generateResponsesPDF(selectedSurvey, completeSubmissions, allUsers || [], memberId, demographicOptions || []);
    }
    setIsResponsePdfModalOpen(false);
  };

  const getLabel = (category: string, value: string) => {
    if (!value) return "-";
    const option = demographicOptions?.find(item => item.categoria === category && item.valor === value);
    return option ? option.label : value;
  };

  const handleDelete = () => {
    if (!selectedSubmission || deleteMutation.isPending) return;
    const name = selectedSubmission.nome_entrevistado || "Anônimo";
    if (!window.confirm(`Excluir permanentemente a resposta de ${name}?`)) return;
    deleteMutation.mutate(selectedSubmission);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, submission: Submission) => {
    if ((event.target as HTMLElement).closest("button, input, select, textarea, a")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelectedSubmission(submission);
    editMutation.reset();
    deleteMutation.reset();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-3xl font-black tracking-tight text-on-surface">Respostas</h1><p className="font-medium text-on-surface-variant">Dados brutos coletados em campo e web</p></div>
        <div className="relative min-w-[320px]">
          <select value={selectedSurveyId} onChange={event => setSelectedSurveyId(event.target.value)} className="w-full appearance-none rounded-2xl border border-outline bg-white py-3 pl-10 pr-10 text-sm font-bold shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 dark:bg-slate-900"><option value="">Selecionar Formulário...</option>{surveys?.map(survey => <option key={survey.id} value={survey.id}>{survey.nome}</option>)}</select>
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={18} /><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-outline bg-white shadow-sm dark:bg-slate-900">
        {!selectedSurveyId ? <div className="flex flex-col items-center justify-center space-y-4 px-10 py-32 text-center"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 dark:bg-slate-800"><Database size={40} /></div><div className="mx-auto max-w-xs"><p className="text-lg font-bold text-on-surface">Nenhum formulário selecionado</p><p className="mt-1 text-sm font-medium text-on-surface-variant">Escolha uma pesquisa no menu acima para carregar os registros.</p></div></div> : isLoading ? <div className="py-32 text-center"><div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="text-xs font-black uppercase tracking-widest text-primary">Carregando dados...</p></div> : (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline bg-slate-50/50 px-6 py-4 dark:bg-slate-800/30">
              <div className="flex items-center gap-3"><span className="rounded-lg border border-outline bg-white px-3 py-1 text-[10px] font-black uppercase text-on-surface-variant shadow-sm dark:bg-slate-900">{totalSubmissions} Registros</span></div>
              <div className="flex flex-wrap items-center gap-3"><div className="relative"><select value={selectedResearcherId} onChange={event => setSelectedResearcherId(event.target.value)} className="appearance-none rounded-xl border border-outline bg-white py-2 pl-9 pr-8 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-900"><option value="todos">Todos os Membros</option>{allUsers?.map(user => <option key={user.id} value={user.id}>{user.nome} {user.role === 'admin' ? '(Adm)' : ''}</option>)}</select><User className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} /><ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} /></div><button onClick={() => setIsExportModalOpen(true)} disabled={!totalSubmissions || isExporting} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"><FileSpreadsheet size={16} />Exportar</button><button type="button" onClick={() => setIsResponsePdfModalOpen(true)} disabled={!validSubmissionCount} className="inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-4 py-2 text-xs font-black text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100" title="Gerar respostas em PDF"><FileDown size={16} />Gerar PDF</button></div>
            </div>
            {!isClient && <div className="flex items-start gap-3 border-b border-primary/10 bg-primary/5 px-6 py-3 text-sm font-bold text-primary"><Lightbulb size={18} className="mt-0.5 shrink-0" /><p>Clique em uma linha para editar os dados da resposta.</p></div>}

            <div className="custom-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1900px] border-collapse text-left">
                <thead><tr className="border-b border-outline bg-slate-50/20 dark:bg-slate-800/10"><th className={cn("sticky left-0 z-10 bg-white px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant dark:bg-slate-900", isClient && "hidden")}>Validade</th><th className={cn("sticky z-10 bg-white px-4 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant dark:bg-slate-900", isClient ? "left-0" : "left-[100px]")}>Avatar</th><th className={cn("sticky z-10 bg-white px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant dark:bg-slate-900", isClient ? "left-[72px]" : "left-[172px]")}>Responsável</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Origem</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Entrevistado</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bairro</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Data/Hora</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Áudio</th><th className="border-l border-outline/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sexo</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Faixa Etária</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Escolaridade</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Renda</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Religião</th>{dynamicColumns.map((question: any) => <th key={question.id} className="min-w-[200px] border-l border-outline/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-primary">{question.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-outline/50">
                  {filteredSubmissions.length === 0 ? <tr><td colSpan={(isClient ? 12 : 13) + dynamicColumns.length} className="py-20 text-center font-bold italic text-on-surface-variant">Nenhum registro encontrado.</td></tr> : filteredSubmissions.map(submission => {
                    const responsibleId = submission.origem === "web" ? submission.referenciado_por : submission.pesquisador_id;
                    const responsible = allUsers?.find(user => user.id === responsibleId) || publicDirectoryById.get(responsibleId || "");
                    const isWeb = submission.origem === 'web';
                    const isValid = submission.valida !== false;
                    return <tr key={submission.id} tabIndex={isClient ? undefined : 0} role={isClient ? undefined : "button"} aria-label={isClient ? undefined : `Editar resposta de ${submission.nome_entrevistado || 'Anônimo'}`} onClick={isClient ? undefined : () => { setSelectedSubmission(submission); editMutation.reset(); deleteMutation.reset(); }} onKeyDown={isClient ? undefined : event => handleRowKeyDown(event, submission)} className={cn("transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary", isClient ? "cursor-default" : "cursor-pointer", isValid ? "hover:bg-slate-50/50 dark:hover:bg-slate-800/30" : "bg-slate-100/70 text-slate-500 grayscale dark:bg-slate-800/60 dark:text-slate-400")}>
                      <td className={cn("sticky left-0 z-10 px-6 py-5", isClient && "hidden", isValid ? "bg-white dark:bg-slate-900" : "bg-slate-100/70 dark:bg-slate-800/60")}><label className="inline-flex cursor-pointer items-center" onClick={event => event.stopPropagation()}><input type="checkbox" role="switch" aria-label={`${isValid ? 'Marcar como inválida' : 'Marcar como válida'} a resposta de ${submission.nome_entrevistado || 'Anônimo'}`} checked={isValid} disabled={validationMutation.isPending} onChange={event => { event.stopPropagation(); setValidationError(null); validationMutation.mutate({ id: submission.id, valida: event.target.checked }); }} className="peer sr-only" /><span className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-60 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" /></label></td>
                      <td className={cn("sticky z-10 px-4 py-5", isClient ? "left-0" : "left-[100px]", isValid ? "bg-white dark:bg-slate-900" : "bg-slate-100/70 dark:bg-slate-800/60")}><ResearcherAvatar name={responsible?.nome || (isWeb ? "Link Direto" : "Sistema")} src={responsible?.foto_avatar_url} className="h-10 w-10 rounded-xl text-sm" /></td>
                      <td className={cn("sticky z-10 px-6 py-5", isClient ? "left-[72px]" : "left-[172px]", isValid ? "bg-white dark:bg-slate-900" : "bg-slate-100/70 dark:bg-slate-800/60")}><div className="flex flex-col"><span className={cn("text-[10px] font-black uppercase", isWeb ? "text-blue-600 dark:text-blue-400" : "text-on-surface-variant")}>{responsible?.nome || (isWeb ? "Link Direto" : "Sistema")}</span>{responsible?.cpf && <span className="text-[9px] font-mono font-bold text-on-surface-variant">CPF: {responsible.cpf}</span>}{isWeb && responsible && <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-blue-500"><UserPlus size={10} />Link do {"role" in responsible && responsible.role === 'admin' ? 'Adm' : 'Pesquisador'}</span>}</div></td>
                      <td className="px-6 py-5"><div className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-tighter", isWeb ? "border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/20" : "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20")}>{isWeb ? <Globe size={12} /> : <Smartphone size={12} />}{submission.origem || 'app'}</div></td>
                      <td className="px-6 py-5"><span className="text-sm font-bold text-on-surface">{submission.nome_entrevistado || "Anônimo"}</span></td>
                      <td className="px-6 py-5"><span className="text-xs font-medium text-on-surface-variant">{submission.bairro || "-"}</span></td>
                      <td className="px-6 py-5"><div className="flex items-center gap-1.5 text-xs font-bold text-on-surface"><Calendar size={12} className="text-primary" />{format(new Date(submission.data_coleta), "dd/MM/yy")}<span className="mx-1 text-[10px] text-outline">|</span><Clock size={12} className="text-primary" />{format(new Date(submission.data_coleta), "HH:mm")}</div></td>
                      <td className="px-6 py-5">{submission.audio?.storage_path && canPlayAudio ? <button type="button" aria-label="Reproduzir áudio da resposta" onClick={event => { event.stopPropagation(); setAudioSubmission(submission); }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary hover:bg-primary/20"><PlayCircle size={16} />Ouvir</button> : <span className="text-xs font-medium text-on-surface-variant">-</span>}</td>
                      <td className="border-l border-outline/20 px-6 py-5"><span className="text-xs font-bold text-on-surface">{getLabel('sexo', submission.dados_fixos?.sexo)}</span></td><td className="px-6 py-5"><span className="text-xs font-bold text-on-surface">{getLabel('faixa_etaria', submission.dados_fixos?.faixa_etaria)}</span></td><td className="px-6 py-5"><span className="text-xs font-medium text-on-surface-variant">{getLabel('escolaridade', submission.dados_fixos?.escolaridade)}</span></td><td className="px-6 py-5"><span className="text-xs font-bold text-on-surface">{getLabel('renda', submission.dados_fixos?.renda)}</span></td><td className="px-6 py-5"><span className="text-xs font-medium text-on-surface-variant">{getLabel('religiao', submission.dados_fixos?.religiao)}</span></td>
                      {dynamicColumns.map((question: any) => { const value = submission.respostas_dinamicas[question.id]; return <td key={question.id} className="border-l border-outline/10 px-6 py-5"><span className="text-xs font-medium text-on-surface/80">{Array.isArray(value) ? value.join(", ") : (value?.toString() || "-")}</span></td>; })}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            {validationError && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{validationError}</p>}
          </div>
        )}
      </div>

      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} isLoading={isExporting} />
      <ResponsePdfModal isOpen={isResponsePdfModalOpen} members={allUsers || []} validCount={validSubmissionCount} validCountsByMember={validCountsByMember} onClose={() => setIsResponsePdfModalOpen(false)} onGenerate={handleGenerateResponsesPDF} />
      <SubmissionEditModal isOpen={!!selectedSubmission} submission={selectedSubmission} survey={selectedSurvey} demographicOptions={demographicOptions} isSaving={editMutation.isPending || deleteMutation.isPending} isDeleting={deleteMutation.isPending} error={deleteMutation.error ? "Não foi possível excluir a resposta." : editMutation.error instanceof Error ? editMutation.error.message : editMutation.error ? "Não foi possível salvar a alteração." : null} onClose={() => { if (!editMutation.isPending && !deleteMutation.isPending) { setSelectedSubmission(null); editMutation.reset(); deleteMutation.reset(); } }} onSave={edits => { if (selectedSubmission) { deleteMutation.reset(); editMutation.mutate({ id: selectedSubmission.id, edits }); } }} onDelete={handleDelete} />
      <AudioPlaybackModal submission={audioSubmission} onClose={() => setAudioSubmission(null)} />
    </div>
  );
}
