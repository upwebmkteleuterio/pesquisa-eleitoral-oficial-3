import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Eye, EyeOff, FileText, Lock, Mail, Save, User, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { surveyService } from "../../services/surveyService";
import { userService } from "../../services/userService";
import { Client } from "../../types";

interface ClientFormProps {
  client?: Client;
  onClose: () => void;
}

export function ClientForm({ client, onClose }: ClientFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(client?.nome || "");
  const [nomeEmpresa, setNomeEmpresa] = useState(client?.nome_empresa || "");
  const [email, setEmail] = useState(client?.email || "");
  const [password, setPassword] = useState("");
  const [pesquisaIds, setPesquisaIds] = useState<string[]>(client?.pesquisa_ids || []);
  const [showPassword, setShowPassword] = useState(false);
  const { data: surveys, isLoading: isSurveysLoading } = useQuery({
    queryKey: ["client_form_surveys", user?.id || "anonymous"],
    queryFn: () => surveyService.getAll(),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: () => userService.manageClient({
      action: client ? "update" : "create",
      id: client?.id,
      nome: nome.trim(),
      nome_empresa: nomeEmpresa.trim() || undefined,
      email: email.trim(),
      cpf: client?.cpf || undefined,
      password: password || undefined,
      pesquisa_ids: pesquisaIds,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client_form_surveys"] });
      onClose();
    },
    onError: (error: Error) => window.alert(error.message || "Não foi possível salvar o cliente."),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!nome.trim() || !email.trim() || (!client && !password)) {
      window.alert("Preencha nome, e-mail e senha para criar um cliente.");
      return;
    }
    mutation.mutate();
  };

  const toggleSurvey = (surveyId: string) => {
    setPesquisaIds(current => current.includes(surveyId)
      ? current.filter(id => id !== surveyId)
      : [...current, surveyId]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-outline bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-outline bg-slate-50 p-8 dark:bg-slate-800/50">
          <div><h2 className="text-2xl font-black text-on-surface">{client ? "Editar Cliente" : "Novo Cliente"}</h2><p className="text-sm font-medium text-on-surface-variant">Configure o acesso somente leitura</p></div>
          <button type="button" onClick={onClose} className="rounded-2xl p-3 text-on-surface-variant hover:bg-white dark:hover:bg-slate-800"><X size={24} /></button>
        </div>
        <form id="client-form" onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-8">
          <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><User size={14} className="text-primary" />Nome do Cliente *</span><input required value={nome} onChange={event => setNome(event.target.value)} className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold dark:bg-slate-800" /></label>
          <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><Building2 size={14} className="text-primary" />Nome da Empresa</span><input value={nomeEmpresa} onChange={event => setNomeEmpresa(event.target.value)} className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold dark:bg-slate-800" /></label>
          <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><Mail size={14} className="text-primary" />E-mail *</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold dark:bg-slate-800" /></label>
          <label className="block space-y-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><Lock size={14} className="text-primary" />{client ? "Nova Senha (opcional)" : "Senha de Acesso *"}</span><div className="relative"><input required={!client} type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 pr-12 font-bold dark:bg-slate-800" /><button type="button" onClick={() => setShowPassword(current => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></label>
          <fieldset className="space-y-3"><legend className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><FileText size={14} className="text-primary" />Formulários vinculados</legend>{isSurveysLoading ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-on-surface-variant dark:bg-slate-800">Carregando pesquisas...</p> : surveys?.length ? <div className="grid max-h-52 gap-2 overflow-y-auto">{surveys.map(survey => { const selected = pesquisaIds.includes(survey.id); return <button key={survey.id} type="button" onClick={() => toggleSurvey(survey.id)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-outline bg-slate-50 text-on-surface-variant dark:bg-slate-800"}`}><span>{survey.nome}</span>{selected && <Check size={18} />}</button>; })}</div> : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-on-surface-variant dark:bg-slate-800">Nenhuma pesquisa disponível.</p>}</fieldset>
        </form>
        <div className="flex shrink-0 gap-4 border-t border-outline bg-slate-50 p-8 dark:bg-slate-800/50"><button type="button" onClick={onClose} className="flex-1 rounded-2xl border-2 border-outline px-6 py-4 font-bold text-on-surface-variant">Cancelar</button><button type="submit" form="client-form" disabled={mutation.isPending} className="flex-[2] rounded-2xl bg-primary px-6 py-4 font-black text-white disabled:opacity-50"><span className="flex items-center justify-center gap-3">{mutation.isPending ? "Processando..." : <><Save size={20} />{client ? "Salvar Alterações" : "Criar Acesso"}</>}</span></button></div>
      </div>
    </div>
  );
}
