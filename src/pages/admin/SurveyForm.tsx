import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../../services/surveyService";
import { surveyOptionImageService } from "../../services/surveyOptionImageService";
import { submissionService } from "../../services/submissionService";
import { userService } from "../../services/userService";
import { supabase } from "../../integrations/supabase/client";
import {
  ArrowLeft, Save, Plus, Trash2, X, ChevronUp, ChevronDown,
  Type, List, CheckSquare, ChevronRight, UserPlus,
  Settings, Users, Target, Info, Sparkles, Globe, AlertCircle
} from "lucide-react";
import { SurveyOptionImageControl } from "../../components/admin/SurveyOptionImageControl";
import { Survey, Region, Researcher, Client, Quota, SurveyStatus, SurveyOptionImage } from "../../types";
import { cn } from "../../lib/utils";

type QuestionType = 'text' | 'radio' | 'checkbox' | 'select' | 'scale';

interface DynamicQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  labels?: Record<number, string>;
}

export default function SurveyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState<'info' | 'form' | 'quotas' | 'researchers'>('info');
  const [nome, setNome] = useState("");
  const [regiaoId, setRegiaoId] = useState("");
  const [status, setStatus] = useState<SurveyStatus>("ativo");
  const [permitirLinkPublico, setPermitirLinkPublico] = useState(false);
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [limiteTotal, setLimiteTotal] = useState(100);
  const [selectedResearchers, setSelectedResearchers] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  
  // Quota states
  const [hasTotalLimit, setHasTotalLimit] = useState(true);
  const [demographicQuotas, setDemographicQuotas] = useState<Quota[]>([]);
  const [isConfiguringQuota, setIsConfiguringQuota] = useState(false);

  // Fetch initial data
  const { data: regions } = useQuery({ queryKey: ['regions'], queryFn: () => surveyService.getRegions() });
  const { data: allResearchers } = useQuery({ queryKey: ['researchers'], queryFn: () => userService.getAllResearchers() });
  const { data: allClients } = useQuery({ queryKey: ['clients'], queryFn: () => userService.getAllClients() });
  const { data: demographicOptions } = useQuery({ queryKey: ['demographicOptions'], queryFn: () => surveyService.getDemographicOptions() });
  
  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveyService.getById(id!),
    enabled: isEditing
  });

  const { data: optionImages = [] } = useQuery<SurveyOptionImage[]>({
    queryKey: ['survey-option-images', id],
    queryFn: () => surveyOptionImageService.getForSurvey(id!),
    enabled: isEditing
  });

  const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', 'survey', id],
    queryFn: () => submissionService.getBySurveyId(id!),
    enabled: isEditing
  });

  const isCheckingStructure = isEditing && (isLoadingSubmissions || submissions === undefined);
  const isStructureLocked = isEditing && !isCheckingStructure && (submissions?.length ?? 0) > 0;
  const canEditStructure = !isCheckingStructure && !isStructureLocked;

  const { data: linkedResearchers } = useQuery({
    queryKey: ['linked_researchers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisa_pesquisadores')
        .select('pesquisador_id')
        .eq('pesquisa_id', id);
      if (error) throw error;
      return data.map(d => d.pesquisador_id);
    },
    enabled: isEditing
  });

  const { data: linkedClients } = useQuery({
    queryKey: ['linked_clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisa_clientes')
        .select('cliente_id')
        .eq('pesquisa_id', id);
      if (error) throw error;
      return data.map(d => d.cliente_id);
    },
    enabled: isEditing
  });

  const { data: existingQuotas } = useQuery({
    queryKey: ['quotas', id],
    queryFn: () => surveyService.getQuotas(id!),
    enabled: isEditing
  });

  useEffect(() => {
    if (survey) {
      setNome(survey.nome);
      setRegiaoId(survey.regiao_id);
      setStatus(survey.status);
      setQuestions(survey.schema_dinamico.questions || []);
      setLimiteTotal(survey.limite_total);
      setPermitirLinkPublico(survey.permitir_link_publico || false);
    }
  }, [survey]);

  useEffect(() => {
    if (linkedResearchers) {
      setSelectedResearchers(linkedResearchers);
    }
  }, [linkedResearchers]);

  useEffect(() => {
    if (linkedClients) {
      setSelectedClients(linkedClients);
    }
  }, [linkedClients]);

  useEffect(() => {
    if (existingQuotas) {
      setDemographicQuotas(existingQuotas);
    }
  }, [existingQuotas]);

  const saveMutation = useMutation({
    mutationFn: async (data: Survey & { researchers: string[]; clients: string[] }) => {
      const { researchers, clients, ...surveyData } = data;
      const savedSurvey = await surveyService.save({ ...surveyData, researchers, clients });
      await surveyService.saveQuotas(savedSurvey.id, demographicQuotas);
      return savedSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_surveys'] });
      queryClient.invalidateQueries({ queryKey: ['surveys_list'] });
      navigate('/adm/formularios');
    }
  });

  const handleAddQuestion = (type: QuestionType) => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => {
      const existingIds = new Set(currentQuestions.map(question => question.id));
      let suffix = currentQuestions.length;
      let questionId = `q_${Date.now()}_${suffix}`;
      while (existingIds.has(questionId)) {
        suffix += 1;
        questionId = `q_${Date.now()}_${suffix}`;
      }

      const newQuestion: DynamicQuestion = {
        id: questionId,
        type,
        label: "",
        required: true,
        options: type !== 'text' && type !== 'scale' ? ["Opção 1"] : undefined,
        min: type === 'scale' ? 1 : undefined,
        max: type === 'scale' ? 5 : undefined
      };
      return [...currentQuestions, newQuestion];
    });
  };

  const handleUpdateQuestion = (id: string, updates: Partial<DynamicQuestion>) => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => currentQuestions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleChangeQuestionType = (id: string, type: QuestionType) => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => currentQuestions.map(question => {
      if (question.id !== id) return question;
      const isChoice = type === 'radio' || type === 'checkbox' || type === 'select';
      return {
        ...question,
        type,
        options: isChoice
          ? (question.options?.length ? question.options : ["Opção 1"])
          : undefined,
        min: type === 'scale' ? question.min ?? 1 : undefined,
        max: type === 'scale' ? question.max ?? 5 : undefined
      };
    }));
  };

  const handleRemoveQuestion = (id: string) => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => currentQuestions.filter(q => q.id !== id));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentQuestions.length) return currentQuestions;

      const newQuestions = [...currentQuestions];
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      return newQuestions;
    });
  };

  const handleAddOption = (questionId: string) => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => currentQuestions.map(question => {
      if (question.id !== questionId) return question;
      const options = question.options || [];
      return {
        ...question,
        options: [...options, `Opção ${options.length + 1}`]
      };
    }));
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    if (!canEditStructure) return;

    setQuestions(currentQuestions => currentQuestions.map(question => {
      if (question.id !== questionId || !question.options) return question;
      return {
        ...question,
        options: question.options.filter((_, index) => index !== optionIndex)
      };
    }));
  };

  const handleAddQuota = (category: string, value: string) => {
    if (demographicQuotas.some(q => q.campo_demografico === category && q.valor_opcao === value)) return;
    
    const newQuota: Quota = {
      id: `q_${Date.now()}`,
      formulario_id: id || '',
      campo_demografico: category,
      valor_opcao: value,
      quantidade_limite: 10,
      quantidade_atual: 0
    };
    setDemographicQuotas([...demographicQuotas, newQuota]);
  };

  const handleRemoveQuota = (quotaId: string) => {
    setDemographicQuotas(demographicQuotas.filter(q => q.id !== quotaId));
  };

  const handleUpdateQuotaLimit = (quotaId: string, limit: number) => {
    setDemographicQuotas(demographicQuotas.map(q => q.id === quotaId ? { ...q, quantidade_limite: limit } : q));
  };

  const handleSave = () => {
    if (!nome || !regiaoId) {
      alert("Preencha o nome da pesquisa e selecione a região.");
      return;
    }

    const payload: Survey & { researchers: string[]; clients: string[] } = {
      id: id || `form_${Date.now()}`,
      nome,
      regiao_id: regiaoId,
      status: status,
      permitir_link_publico: permitirLinkPublico,
      limite_total: hasTotalLimit ? limiteTotal : 999999,
      total_coletado: survey?.total_coletado || 0,
      schema_dinamico: { questions },
      acesso_global: selectedResearchers.length === 0,
      researchers: selectedResearchers,
      clients: selectedClients
    };

    saveMutation.mutate(payload);
  };

  if (isLoading && isEditing) return <div className="p-10 text-center font-bold">Carregando formulário...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-outline border-b-4 border-b-primary/10">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/adm/formularios')}
            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none mb-2">
              {isEditing ? "Configurar Pesquisa" : "Novo Formulário"}
            </h1>
            <p className="text-on-surface-variant font-medium text-sm flex items-center gap-1.5 uppercase tracking-widest text-[10px] font-black">
              ID: {id || "Gerado no salvamento"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/adm/formularios')}
            className="px-6 py-4 border-2 border-outline rounded-2xl font-bold text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
          >
            <Save size={20} />
            {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-2 sticky top-8 self-start h-fit">
          {[
            { id: 'info', icon: Settings, label: 'Informações Básicas' },
            { id: 'form', icon: Type, label: 'Perguntas' },
            { id: 'quotas', icon: Target, label: 'Cotas' },
            { id: 'researchers', icon: Users, label: 'Pesquisadores' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center justify-between p-5 rounded-3xl font-bold transition-all border-2",
                activeTab === tab.id 
                  ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]" 
                  : "bg-white dark:bg-slate-900 text-on-surface-variant border-outline hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={20} />
                <span className="text-sm">{tab.label}</span>
              </div>
              <ChevronRight size={16} className={activeTab === tab.id ? "opacity-100" : "opacity-0"} />
            </button>
          ))}

          {/* Sticky Question Picker */}
          {activeTab === 'form' && (
            <div className="mt-8 space-y-4 animate-in slide-in-from-left-4 duration-500">
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border border-b-8 border-slate-800 border-b-black/20">
                <div className="mb-8">
                   <h3 className="text-lg font-black tracking-tight mb-1 uppercase tracking-widest text-primary">
                     Adicionar Campos
                   </h3>
                   <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-60">
                     Toque para inserir no formulário
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'text', icon: Type, label: 'Texto Curto' },
                    { id: 'radio', icon: List, label: 'Única Escolha' },
                    { id: 'checkbox', icon: CheckSquare, label: 'Múltipla' },
                    { id: 'select', icon: List, label: 'Dropdown' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleAddQuestion(btn.id as any)}
                      disabled={!canEditStructure}
                      className="flex flex-col items-center justify-center p-6 bg-slate-800 border border-white/5 rounded-3xl hover:bg-primary transition-all group active:scale-90 border-b-4 border-b-black/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
                    >
                      <btn.icon size={24} className="mb-3 group-hover:scale-110 transition-transform text-white/80 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {activeTab === 'info' && (
            <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-outline space-y-10 animate-in fade-in duration-300">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-on-surface tracking-tight">Identificação da Pesquisa</h3>
                <p className="text-on-surface-variant font-medium text-sm">Defina o título principal e a abrangência geográfica.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-1">Título do Formulário *</label>
                  <input 
                    type="text" 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Pesquisa de Intenção de Voto - Mai/2024"
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-outline rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-xl text-on-surface placeholder:text-on-surface-variant/30"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-1">Status da Pesquisa</label>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-[2rem] border-2 border-outline">
                    {(['ativo', 'pausado', 'concluido'] as SurveyStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={cn(
                          "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                          status === s 
                            ? "bg-white dark:bg-slate-900 shadow-md text-primary border border-primary/20 scale-105" 
                            : "text-on-surface-variant opacity-40 hover:opacity-100"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 lg:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-1">Região / Município de Atuação *</label>
                  <select 
                    value={regiaoId}
                    onChange={(e) => setRegiaoId(e.target.value)}
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-outline rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-xl text-on-surface appearance-none cursor-pointer"
                  >
                    <option value="">Selecione uma região cadastrada</option>
                    {regions?.map(r => (
                      <option key={r.id} value={r.id}>{r.cidade} - {r.estado}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 lg:col-span-2 p-8 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 animate-in zoom-in duration-500">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                        <Globe size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-on-surface tracking-tight">Coleta via Link Público</h4>
                        <p className="text-on-surface-variant font-medium text-xs">Ative para permitir que qualquer pessoa com o link possa responder via WhatsApp/Web.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPermitirLinkPublico(!permitirLinkPublico)}
                      className={cn(
                        "w-16 h-9 rounded-full transition-all relative shrink-0 shadow-inner",
                        permitirLinkPublico ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-7 h-7 bg-white rounded-full transition-all shadow-md flex items-center justify-center",
                        permitirLinkPublico ? "left-8" : "left-1"
                      )}>
                        {permitirLinkPublico && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'form' && (
            <div className="relative">
              {isCheckingStructure && (
                <div className="mb-6 flex items-center gap-3 rounded-[2rem] border border-primary/20 bg-primary/5 p-6 text-sm font-bold text-primary">
                  <AlertCircle size={20} />
                  Verificando se este formulário já possui coletas. A estrutura permanecerá protegida durante a verificação.
                </div>
              )}
              {isStructureLocked && (
                <div className="mb-6 flex items-start gap-3 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <span>A estrutura deste formulário está bloqueada após a primeira coleta. Não é possível adicionar, remover, mover ou editar perguntas, tipos, obrigatoriedade e alternativas.</span>
                </div>
              )}
              <div className="space-y-6 transition-all duration-500">
                {questions.length === 0 ? (
                  <div className="bg-white/50 dark:bg-slate-900/30 border-2 border-dashed border-outline rounded-[2.5rem] py-28 text-center px-10">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                      <Plus size={32} />
                    </div>
                    <p className="text-on-surface-variant font-bold text-lg mb-2">Formulário Vazio</p>
                    <p className="text-on-surface-variant/60 font-medium text-sm">Utilize os componentes à esquerda para começar a montar sua pesquisa.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!isEditing && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const json = prompt("Cole aqui o JSON gerado pela IA:");
                            if (json) {
                              try {
                                const parsed = JSON.parse(json);
                                if (Array.isArray(parsed)) {
                                  setQuestions([...questions, ...parsed.map((q, i) => ({
                                    ...q,
                                    id: q.id || `q_ia_${Date.now()}_${i}`,
                                    required: q.required ?? true
                                  }))]);
                                  alert("Questões adicionadas com sucesso!");
                                } else {
                                  alert("O JSON deve ser um array de perguntas.");
                                }
                              } catch (e) {
                                alert("JSON inválido.");
                              }
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-xl font-bold text-[10px] flex items-center gap-2 hover:bg-primary hover:text-white transition-all border border-outline"
                        >
                          <Sparkles size={14} />
                          IMPORTAR IA
                        </button>
                      </div>
                    )}

                    {questions.map((q, index) => (
                      <div key={q.id} className={cn(
                        "bg-white dark:bg-slate-900 border border-outline rounded-[2rem] p-6 lg:p-8 shadow-sm group animate-in slide-in-from-bottom-2 duration-300 transition-all",
                        !isEditing && "hover:border-primary/30"
                      )}>
                        <div className="flex flex-col lg:flex-row gap-8">
                          {/* Control Column */}
                          <div className="flex lg:flex-col gap-2 justify-center shrink-0">
                            <button
                              disabled={!canEditStructure || index === 0}
                              onClick={() => handleMoveQuestion(index, 'up')}
                              className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-on-surface-variant hover:bg-primary hover:text-white disabled:opacity-30 transition-all active:scale-90"
                            >
                              <ChevronUp size={20} />
                            </button>
                            <button
                              disabled={!canEditStructure || index === questions.length - 1}
                              onClick={() => handleMoveQuestion(index, 'down')}
                              className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-on-surface-variant hover:bg-primary hover:text-white disabled:opacity-30 transition-all active:scale-90"
                            >
                              <ChevronDown size={20} />
                            </button>
                            <button
                              disabled={!canEditStructure}
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>

                          {/* Editor Column */}
                          <div className="flex-1 space-y-6">
                             <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
                                 <select
                                   value={q.type}
                                   onChange={(e) => handleChangeQuestionType(q.id, e.target.value as QuestionType)}
                                   disabled={!canEditStructure}
                                   className="bg-transparent text-[10px] font-black uppercase text-primary tracking-widest focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                                 >
                                   <option value="text">Texto Curto</option>
                                   <option value="radio">Única Escolha</option>
                                   <option value="checkbox">Múltipla</option>
                                   <option value="select">Dropdown</option>
                                   <option value="scale">Escala</option>
                                 </select>
                                 <span className="w-1 h-1 bg-primary/20 rounded-full" />
                                 <span className="text-[10px] font-bold text-on-surface-variant uppercase">Questão {index + 1}</span>
                               </div>
                               <label className="flex items-center gap-2 group/label cursor-pointer">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant group-hover/label:text-primary transition-colors">Obrigatório</span>
                                  <input
                                    type="checkbox"
                                    checked={q.required}
                                    onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                                    disabled={!canEditStructure}
                                    className="w-5 h-5 accent-primary rounded-lg cursor-pointer disabled:cursor-not-allowed"
                                  />
                               </label>
                             </div>

                             <div className="space-y-2">
                               <input
                                 type="text"
                                 value={q.label}
                                 onChange={(e) => handleUpdateQuestion(q.id, { label: e.target.value })}
                                 placeholder="Digite a pergunta aqui..."
                                 disabled={!canEditStructure}
                                 className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl transition-all font-bold text-lg placeholder:italic focus:outline-none focus:border-primary/20 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                               />
                             </div>

                             {(['radio', 'checkbox', 'select'] as QuestionType[]).includes(q.type) && (
                               <div className="space-y-4 pt-4 border-t border-outline border-dashed">
                                 <div className="flex items-center justify-between">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-primary mr-auto">Alternativas</label>
                                   <button
                                     type="button"
                                     onClick={() => handleAddOption(q.id)}
                                     disabled={!canEditStructure}
                                     className="flex items-center gap-1 px-3 py-2 text-primary hover:bg-primary/10 rounded-xl font-black text-[10px] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40"
                                   >
                                     <Plus size={14} />
                                     Adicionar
                                   </button>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                   {(q.options || []).map((opt, optIndex) => (
                                     <div key={`${q.id}-${optIndex}`} className="relative group">
                                       <div className="flex items-center gap-2">
                                         <input
                                           type="text"
                                           value={opt}
                                           onChange={(e) => handleUpdateQuestion(q.id, { options: q.options?.map((option, index) => index === optIndex ? e.target.value : option) })}
                                           disabled={!canEditStructure}
                                           className="min-w-0 flex-1 px-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-outline rounded-xl font-medium text-xs transition-colors focus:bg-white focus:border-primary/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                                         />
                                         <SurveyOptionImageControl
                                           surveyId={id}
                                           questionId={q.id}
                                           alternative={opt}
                                           image={optionImages.find(image => image.pergunta_id === q.id && image.alternativa === opt)}
                                         />
                                       </div>
                                       <button
                                         type="button"
                                         onClick={() => handleRemoveOption(q.id, optIndex)}
                                         disabled={!canEditStructure}
                                         className="absolute top-1.5 right-[3.75rem] flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-on-surface-variant opacity-0 pointer-events-none transition-all hover:bg-error hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-0"
                                         aria-label={`Excluir alternativa ${optIndex + 1}`}
                                         title="Excluir alternativa"
                                       >
                                         <X size={14} />
                                       </button>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'quotas' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-outline space-y-10">
                 <div className="flex items-start justify-between gap-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-on-surface tracking-tight">Limite Geral de Amostragem</h3>
                      <p className="text-on-surface-variant font-medium text-sm">Defina quantas entrevistas no total este formulário pode receber.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-outline">
                      <button 
                        onClick={() => setHasTotalLimit(false)}
                        className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase transition-all", !hasTotalLimit ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-on-surface-variant opacity-50")}
                      >Ilimitado</button>
                      <button 
                        onClick={() => setHasTotalLimit(true)}
                        className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase transition-all", hasTotalLimit ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-on-surface-variant opacity-50")}
                      >Com Limite</button>
                    </div>
                 </div>

                 {hasTotalLimit && (
                   <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/20 max-w-sm">
                      <label className="block text-xs font-black uppercase tracking-widest text-primary mb-3 text-center">Quantidade de Entrevistas</label>
                      <div className="flex items-center justify-center gap-8">
                        <button onClick={() => setLimiteTotal(Math.max(1, limiteTotal - 10))} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all text-xl font-bold">-</button>
                        <input 
                          type="number" 
                          value={limiteTotal}
                          onChange={(e) => setLimiteTotal(parseInt(e.target.value) || 0)}
                          className="w-32 bg-transparent text-center text-4xl font-black text-on-surface focus:outline-none"
                        />
                        <button onClick={() => setLimiteTotal(limiteTotal + 10)} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all text-xl font-bold">+</button>
                      </div>
                   </div>
                 )}
               </section>

               <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-outline space-y-8">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-on-surface tracking-tight leading-tight">Cotas por Perfil Demográfico</h3>
                       <p className="text-on-surface-variant font-medium text-sm">Controle automático de amostragem por sub-perfil (Sexo, Renda, etc).</p>
                    </div>
                    <button 
                      onClick={() => setIsConfiguringQuota(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                       <Plus size={20} />
                       Nova Cota
                    </button>
                 </div>

                 {demographicQuotas.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-outline rounded-[3rem] px-8">
                        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                           <Target size={40} />
                        </div>
                        <p className="text-on-surface-variant font-bold text-lg mb-4 italic">Nenhuma cota configurada para este formulário.</p>
                        <button 
                          onClick={() => setIsConfiguringQuota(true)}
                          className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3 mx-auto hover:bg-primary transition-all shadow-xl active:scale-95"
                        >
                           <Plus size={20} />
                           CONFIGURAR PRIMEIRA COTA
                        </button>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {demographicQuotas.map((quota) => (
                          <div key={quota.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 border border-outline rounded-[2rem] group hover:border-primary/20 transition-all">
                             <div>
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">{quota.campo_demografico}</p>
                                <p className="text-lg font-black text-on-surface">{quota.valor_opcao}</p>
                             </div>
                             <div className="flex items-center gap-6">
                                <div className="text-right">
                                   <label className="block text-[8px] font-black uppercase text-on-surface-variant mb-1">Limite</label>
                                   <input 
                                      type="number"
                                      value={quota.quantidade_limite}
                                      onChange={(e) => handleUpdateQuotaLimit(quota.id, parseInt(e.target.value) || 0)}
                                      className="w-16 bg-white dark:bg-slate-900 border border-outline rounded-lg text-center font-black py-1 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                   />
                                </div>
                                <button 
                                  onClick={() => handleRemoveQuota(quota.id || '')}
                                  className="p-3 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                   <Trash2 size={20} />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
               </section>

               {/* Quota Selection Modal */}
               {isConfiguringQuota && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsConfiguringQuota(false)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-outline max-h-[85vh] overflow-hidden flex flex-col">
                       <div className="flex items-center justify-between mb-8 shrink-0">
                          <div>
                             <h2 className="text-3xl font-black text-on-surface tracking-tight">Vincular Cotas</h2>
                             <p className="text-on-surface-variant font-medium">Selecione as opções demográficas para monitorar.</p>
                          </div>
                          <button onClick={() => setIsConfiguringQuota(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all">
                             <Trash2 size={20} />
                          </button>
                       </div>

                       <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-10 pb-8">
                          {Array.from(new Set(demographicOptions?.map(o => o.categoria))).map(category => (
                             <div key={category} className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary bg-primary/5 px-4 py-2 rounded-lg inline-block">{category.replace('_', ' ')}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                   {demographicOptions?.filter(o => o.categoria === category).map(opt => {
                                      const isSelected = demographicQuotas.some(q => q.campo_demografico === category && q.valor_opcao === opt.label);
                                      return (
                                        <button 
                                          key={opt.id}
                                          onClick={() => isSelected ? handleRemoveQuota(demographicQuotas.find(q => q.campo_demografico === category && q.valor_opcao === opt.label)?.id || '') : handleAddQuota(category, opt.label)}
                                          className={cn(
                                            "p-4 rounded-2xl border-2 font-bold text-xs text-left transition-all",
                                            isSelected 
                                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.05]" 
                                              : "bg-slate-50 dark:bg-slate-800 border-outline hover:border-primary/40 text-on-surface"
                                          )}
                                        >
                                           {opt.label}
                                        </button>
                                      );
                                   })}
                                </div>
                             </div>
                          ))}
                       </div>

                       <div className="pt-8 border-t border-outline flex justify-end shrink-0">
                          <button 
                            onClick={() => setIsConfiguringQuota(false)}
                            className="px-10 py-4 bg-primary text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                          >
                             CONCLUIR SELEÇÃO
                          </button>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'researchers' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-300">
               <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-outline space-y-8">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-on-surface tracking-tight">Vínculo com Pesquisadores</h3>
                      <p className="text-on-surface-variant font-medium text-sm">Selecione quem poderá visualizar e coletar dados para esta pesquisa.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                       <Users size={18} />
                       <span className="font-black text-xs uppercase tracking-widest">{selectedResearchers.length} Ativos</span>
                    </div>
                 </div>

                 {selectedResearchers.length === 0 ? (
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                       <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                          <Globe size={24} />
                       </div>
                       <div className="space-y-1">
                          <p className="text-blue-900 dark:text-blue-200 font-black text-sm uppercase tracking-tight">Acesso Global Ativado</p>
                          <p className="text-blue-700 dark:text-blue-400 text-xs font-medium leading-relaxed">Como nenhum pesquisador foi selecionado, este formulário ficará <span className="font-bold underline">visível para toda a equipe</span> automaticamente.</p>
                       </div>
                    </div>
                 ) : (
                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                       <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center shrink-0">
                          <ShieldCheck size={24} />
                       </div>
                       <div className="space-y-1">
                          <p className="text-primary font-black text-sm uppercase tracking-tight">Acesso Restrito</p>
                          <p className="text-on-surface-variant text-xs font-medium leading-relaxed">Este formulário será visível apenas para os <span className="font-bold">{selectedResearchers.length} pesquisadores</span> selecionados abaixo.</p>
                       </div>
                    </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allResearchers?.map(r => {
                      const isSelected = selectedResearchers.includes(r.id);
                      return (
                        <button 
                          key={r.id}
                          onClick={() => {
                            if (isSelected) setSelectedResearchers(selectedResearchers.filter(id => id !== r.id));
                            else setSelectedResearchers([...selectedResearchers, r.id]);
                          }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-3xl border-2 transition-all text-left",
                            isSelected 
                              ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" 
                              : "bg-slate-50 dark:bg-slate-800 border-transparent hover:border-outline"
                          )}
                        >
                          {r.foto_avatar_url ? (
                            <img src={r.foto_avatar_url} className="w-12 h-12 rounded-xl border border-white object-cover" alt="" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border-2 border-white shadow-sm uppercase">
                              {r.nome.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className={cn("font-bold text-sm", isSelected ? "text-primary" : "text-on-surface")}>{r.nome}</p>
                            <p className="text-[10px] text-on-surface-variant font-medium truncate">{r.email}</p>
                          </div>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                            isSelected ? "bg-primary text-white scale-110" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                          )}>
                             {isSelected ? <UserPlus size={16} /> : <Plus size={16} />}
                          </div>
                        </button>
                      );
                    })}
                 </div>

                 <div className="space-y-5 border-t border-outline pt-8">
                   <div className="flex items-center justify-between gap-4">
                     <div>
                       <h4 className="text-xl font-black text-on-surface">Vínculo com Clientes</h4>
                       <p className="text-on-surface-variant text-sm font-medium">Clientes poderão consultar apenas respostas válidas desta pesquisa.</p>
                     </div>
                     <span className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">{selectedClients.length} Ativos</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {allClients?.map((client: Client) => {
                       const isSelected = selectedClients.includes(client.id);
                       return <button key={client.id} type="button" onClick={() => setSelectedClients(current => isSelected ? current.filter(clientId => clientId !== client.id) : [...current, client.id])} className={cn("flex items-center gap-4 rounded-3xl border-2 p-4 text-left transition-all", isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-transparent bg-slate-50 dark:bg-slate-800 hover:border-outline")}>
                         <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-black uppercase text-primary">{client.nome.charAt(0)}</div>
                         <div className="flex-1"><p className={cn("text-sm font-bold", isSelected ? "text-primary" : "text-on-surface")}>{client.nome}</p><p className="truncate text-[10px] font-medium text-on-surface-variant">{client.email}</p></div>
                         <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", isSelected ? "bg-primary text-white" : "bg-slate-200 text-slate-400")}>{isSelected ? <UserPlus size={16} /> : <Plus size={16} />}</div>
                       </button>;
                     })}
                   </div>
                 </div>
               </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}