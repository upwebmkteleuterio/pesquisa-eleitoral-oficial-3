import React, { useEffect, useState } from "react";
import { X, Save, User, Mail, CreditCard, Lock, Eye, EyeOff, Camera, Trash2 } from "lucide-react";
import { Researcher } from "../../types";
import { userService } from "../../services/userService";
import { researcherAvatarService } from "../../services/researcherAvatarService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import { ResearcherAvatar } from "../../components/ResearcherAvatar";

interface ResearcherFormProps {
  onClose: () => void;
  researcher?: Researcher;
}

function getSavedResearcherId(saved: any): string | undefined {
  return saved?.id || saved?.userId || saved?.profile?.id || saved?.researcher?.id || saved?.user?.id || saved?.data?.id;
}

export function ResearcherForm({ onClose, researcher }: ResearcherFormProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File>();
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(researcher?.foto_avatar_url || null);
  
  const [formData, setFormData] = useState({
    nome: researcher?.nome || "",
    email: researcher?.email || "",
    cpf: researcher?.cpf || "",
  });

  useEffect(() => {
    if (!avatarFile) return;
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const formatCPF = (value: string) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const validateCPF = (cpf: string) => cpf.replace(/\D/g, '').length === 11;

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const saved = await userService.saveResearcher(data);
      let avatarError: string | null = null;
      const researcherId = researcher?.id || getSavedResearcherId(saved);
      if (!researcherId) {
        avatarError = "não foi possível sincronizar o diretório público";
      } else {
        try {
          await researcherAvatarService.save({
            pesquisadorId: researcherId,
            nome: formData.nome,
            cpf: formData.cpf,
            file: avatarFile,
            remove: removeAvatar,
            legacyUrl: researcher?.foto_avatar_url,
          });
        } catch (error) {
          avatarError = error instanceof Error ? error.message : "a foto não pôde ser salva";
          await researcherAvatarService.save({
            pesquisadorId: researcherId,
            nome: formData.nome,
            cpf: formData.cpf,
            legacyUrl: researcher?.foto_avatar_url,
          }).catch(() => undefined);
        }
      }
      return { saved, avatarError };
    },
    onSuccess: ({ avatarError }) => {
      queryClient.invalidateQueries({ queryKey: ['researchers'] });
      queryClient.invalidateQueries({ queryKey: ['all_researchers'] });
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      if (avatarError) alert(`Cadastro salvo, mas ${avatarError}.`);
      onClose();
    },
    onError: (err: any) => {
      alert(err.message || "Erro ao salvar pesquisador.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.cpf) return alert("Preencha todos os campos obrigatórios.");
    if (!validateCPF(formData.cpf)) return alert("Por favor, insira um CPF válido com 11 dígitos.");
    if (!researcher && !password) return alert("A senha é obrigatória para novos cadastros.");

    saveMutation.mutate({ ...formData, id: researcher?.id, password: password || undefined });
  };

  const handleAvatarSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setRemoveAvatar(false);
    event.target.value = "";
  };

  const handleAvatarRemoval = () => {
    setAvatarFile(undefined);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-outline bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-outline bg-slate-50 p-8 dark:bg-slate-800/50">
          <div><h2 className="text-2xl font-black tracking-tight text-on-surface">{researcher ? "Editar Pesquisador" : "Novo Pesquisador"}</h2><p className="text-sm font-medium text-on-surface-variant">Configure o acesso do colaborador</p></div>
          <button onClick={onClose} className="rounded-2xl p-3 text-on-surface-variant shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800"><X size={24} /></button>
        </div>

        <form id="researcher-form" onSubmit={handleSubmit} className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-8">
          <div className="flex items-center gap-4 rounded-2xl border border-outline bg-slate-50 p-4 dark:bg-slate-800/50">
            <ResearcherAvatar name={formData.nome} src={avatarPreview} className="h-16 w-16 shrink-0 rounded-2xl text-2xl" />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-white transition hover:brightness-110"><Camera size={16} />Selecionar foto<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarSelection} /></label>
              {(avatarPreview || researcher?.foto_avatar_url) && <button type="button" onClick={handleAvatarRemoval} className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2 text-xs font-black text-on-surface-variant transition hover:border-error hover:text-error"><Trash2 size={16} />Remover</button>}
              <p className="basis-full text-[10px] font-medium text-on-surface-variant">Opcional. JPEG, PNG ou WebP, até 300 KB após processamento.</p>
            </div>
          </div>

          <div className="space-y-2"><label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><User size={14} className="text-primary" />Nome Completo *</label><input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Maria Oliveira" className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800" /></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2"><label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><Mail size={14} className="text-primary" />E-mail Institucional *</label><input type="email" disabled={!!researcher} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="maria@eleitoral.com" className={cn("w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800", researcher && "cursor-not-allowed opacity-50")} /></div>
            <div className="space-y-2"><label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><CreditCard size={14} className="text-primary" />CPF *</label><input type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})} placeholder="000.000.000-00" maxLength={14} className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800" /></div>
          </div>
          <div className="space-y-2"><label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant"><Lock size={14} className="text-primary" />{researcher ? "Nova Senha (opcional)" : "Senha de Acesso *"}</label><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={researcher ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
        </form>

        <div className="flex shrink-0 flex-col gap-4 border-t border-outline bg-slate-50 p-8 dark:bg-slate-800/50 md:flex-row"><button type="button" onClick={onClose} className="flex-1 rounded-2xl border-2 border-outline px-6 py-4 font-bold text-on-surface-variant transition-all hover:bg-white dark:hover:bg-slate-800">Cancelar</button><button type="submit" form="researcher-form" disabled={saveMutation.isPending} className="flex-[2] rounded-2xl bg-primary px-6 py-4 font-black text-white shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-50">{saveMutation.isPending ? "Processando..." : <span className="flex items-center justify-center gap-3"><Save size={20} />{researcher ? "Salvar Alterações" : "Criar Acesso"}</span>}</button></div>
      </div>
    </div>
  );
}