import React, { useState } from "react";
import { X, Save, User, Mail, CreditCard, Lock, Eye, EyeOff } from "lucide-react";
import { Researcher } from "../../types";
import { userService } from "../../services/userService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/utils";

interface ResearcherFormProps {
  onClose: () => void;
  researcher?: Researcher;
}

export function ResearcherForm({ onClose, researcher }: ResearcherFormProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  
  const [formData, setFormData] = useState({
    nome: researcher?.nome || "",
    email: researcher?.email || "",
    cpf: researcher?.cpf || "",
  });

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cpf: formatCPF(e.target.value) });
  };

  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => userService.saveResearcher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researchers'] });
      onClose();
    },
    onError: (err: any) => {
      alert(err.message || "Erro ao salvar pesquisador.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.cpf) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!validateCPF(formData.cpf)) {
      alert("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    if (!researcher && !password) {
      alert("A senha é obrigatória para novos cadastros.");
      return;
    }

    const payload = {
      ...formData,
      id: researcher?.id,
      password: password || undefined
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-outline animate-in zoom-in duration-200">
        <div className="p-8 border-b border-outline flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-on-surface tracking-tight">
              {researcher ? "Editar Pesquisador" : "Novo Pesquisador"}
            </h2>
            <p className="text-on-surface-variant font-medium text-sm">Configure o acesso do colaborador</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-on-surface-variant hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        <form id="researcher-form" onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <User size={14} className="text-primary" />
              Nome Completo *
            </label>
            <input 
              type="text" 
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Maria Oliveira"
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Mail size={14} className="text-primary" />
                E-mail Institucional *
              </label>
              <input 
                type="email" 
                disabled={!!researcher}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="maria@eleitoral.com"
                className={cn(
                  "w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-on-surface",
                  researcher && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <CreditCard size={14} className="text-primary" />
                CPF *
              </label>
              <input 
                type="text" 
                value={formData.cpf}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-on-surface"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Lock size={14} className="text-primary" />
              {researcher ? "Nova Senha (opcional)" : "Senha de Acesso *"}
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={researcher ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-on-surface"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-all"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </form>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-outline flex flex-col md:flex-row gap-4 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-6 border-2 border-outline rounded-2xl font-bold text-on-surface-variant hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="researcher-form"
            disabled={saveMutation.isPending}
            className="flex-[2] py-4 px-6 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Processando..." : (
              <>
                <Save size={20} />
                {researcher ? "Salvar Alterações" : "Criar Acesso"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}