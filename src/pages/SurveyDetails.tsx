import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { surveyService } from "../services/surveyService";
import { submissionService } from "../services/submissionService";
import { ArrowLeft, Users, Calendar, Wallet, PlayCircle, Share2, Check, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

export default function SurveyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/p/${id}?u=${user?.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: survey?.nome || 'Pesquisa Veraxus',
        text: `Olá! Você poderia responder a esta breve pesquisa? Sua opinião é muito importante:`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { data: survey, isLoading: surveyLoading, isError: surveyError, refetch: retrySurvey } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveyService.getById(id!),
    enabled: !!id
  });

  // UNIFICADO: Mesma chave 'submissions', 'survey-data' do Card
  const { data: submissions, isLoading: submissionsLoading, isError: submissionsError, refetch: retrySubmissions } = useQuery({
    queryKey: ['submissions', 'survey-data', id],
    queryFn: () => submissionService.getBySurveyId(id!),
    enabled: !!id
  });

  const { data: quotas, isLoading: quotasLoading, isError: quotasError, refetch: retryQuotas } = useQuery({
    queryKey: ['quotas', id],
    queryFn: () => surveyService.getQuotas(id!),
    enabled: !!id
  });

  const { data: demographicOptions } = useQuery({
    queryKey: ['demographic_options_details'],
    queryFn: () => surveyService.getDemographicOptions()
  });

  if (surveyLoading || quotasLoading || submissionsLoading) return <div className="p-5 animate-pulse">Carregando detalhes...</div>;
  if (surveyError || submissionsError || quotasError || !survey) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-medium text-on-surface-variant">Não foi possível carregar os detalhes. Se estiver offline, tente novamente quando a conexão voltar.</p>
        <button type="button" onClick={() => { retrySurvey(); retrySubmissions(); retryQuotas(); }} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white">
          <RefreshCw size={18} /> Tentar novamente
        </button>
      </div>
    );
  }

  const totalCollected = submissions?.length || 0;
  const progressPercent = Math.round((totalCollected / survey.limite_total) * 100);

  const categoryMap: Record<string, string> = {
    "Sexo": "sexo",
    "Faixa Etária": "faixa_etaria",
    "Renda / Classe": "renda",
    "Escolaridade": "escolaridade",
    "Religião": "religiao",
  };

  const quotasByGroup = quotas?.reduce((acc, quota) => {
    if (!acc[quota.campo_demografico]) acc[quota.campo_demografico] = [];
    
    const fieldKey = categoryMap[quota.campo_demografico] || quota.campo_demografico.toLowerCase();
    const count = submissions?.filter(sub => {
      const option = demographicOptions?.find(o => o.categoria === fieldKey && o.label === quota.valor_opcao);
      const subValue = sub.dados_fixos[fieldKey];
      return option ? subValue === option.valor : subValue === quota.valor_opcao;
    }).length || 0;

    acc[quota.campo_demografico].push({ ...quota, quantidade_atual: count });
    return acc;
  }, {} as Record<string, typeof quotas>) || {};

  const icons = {
    "Sexo": Users,
    "Faixa Etária": Calendar,
    "Renda / Classe": Wallet
  };

  return (
    <div className="flex flex-col -mx-5">
      <div className="bg-surface h-16 flex items-center px-5 border-b border-outline">
        <button onClick={() => navigate(-1)} className="mr-4 text-on-surface-variant hover:text-primary p-2 rounded-xl hover:bg-primary/5 transition-all">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-on-surface uppercase tracking-tight">Detalhes da Pesquisa</h1>
      </div>

      <div className="p-5 space-y-6">
        {/* Status Geral */}
        <section className="bg-surface rounded-xl p-5 tonal-card border border-outline shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-on-surface uppercase text-xs tracking-widest">Status Geral da Cota</h3>
            <span className="bg-primary-container text-white font-bold px-3 py-1 rounded-full text-xs shadow-sm">
              {progressPercent}%
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant font-medium">Progresso Atual</span>
              <span className="font-bold text-primary-container">{totalCollected} / {survey.limite_total} entrevistas</span>
            </div>
            <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-container rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                style={{ width: `${Math.min(progressPercent, 100)}%` }} 
              />
            </div>
            <p className="text-xs text-on-surface-variant italic font-medium text-center">Faltam {Math.max(0, survey.limite_total - totalCollected)} entrevistas para concluir a meta total.</p>
          </div>
        </section>

        {/* Botão de Compartilhar Link Público */}
        {survey.permitir_link_publico && (
          <section className="bg-primary/5 rounded-2xl p-6 border-2 border-dashed border-primary/30 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
              <Share2 size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black text-on-surface">Compartilhar Pesquisa</h4>
              <p className="text-sm text-on-surface-variant font-medium">Envie o link via WhatsApp para coletar respostas online.</p>
            </div>
            <button
              onClick={handleShare}
              className={cn(
                "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                copied ? "bg-green-500 text-white" : "bg-white border-2 border-primary text-primary"
              )}
            >
              {copied ? (
                <><Check size={20} /> LINK COPIADO!</>
              ) : (
                <><Share2 size={20} /> COMPARTILHAR LINK</>
              )}
            </button>
          </section>
        )}

        {Object.keys(quotasByGroup).length > 0 && (
          <>
            <h3 className="text-lg font-bold text-on-surface px-1">Status por Dados Demográficos</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(quotasByGroup).map(([group, groupQuotas]) => {
                const Icon = icons[group as keyof typeof icons] || Users;
                
                return (
                  <div key={group} className="bg-surface rounded-2xl p-6 shadow-sm border border-outline">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <Icon size={22} />
                      </div>
                      <h4 className="font-bold text-on-surface uppercase text-sm tracking-tight">{group}</h4>
                    </div>
                    <div className="space-y-6">
                      {groupQuotas.map((quota) => (
                        <div key={quota.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-on-surface font-bold">{quota.valor_opcao}</span>
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-primary">{quota.quantidade_atual} / {quota.quantidade_limite}</span>
                              <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-tighter">Faltam {Math.max(0, quota.quantidade_limite - (quota.quantidade_atual || 0))}</span>
                            </div>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <div 
                              className="h-full bg-primary-container rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                              style={{ width: `${Math.min(((quota.quantidade_atual || 0) / quota.quantidade_limite) * 100, 100)}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Link 
          to={`/collection/${id}`}
          className="bg-primary text-white p-5 rounded-xl shadow-lg flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex flex-col">
            <h4 className="text-xl font-bold">Iniciar Nova Entrevista</h4>
            <p className="text-sm opacity-90">Continuar coleta em campo</p>
          </div>
          <PlayCircle size={40} fill="white" stroke="#006c52" />
        </Link>
      </div>
    </div>
  );
}