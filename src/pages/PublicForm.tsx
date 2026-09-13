import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../services/surveyService";
import { submissionService } from "../services/submissionService";
import { ArrowLeft, ArrowRight, Check, CheckCircle, Camera, RefreshCw, AlertTriangle, MapPin, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { calculateFormProgress } from "../lib/progressUtils";
import { AutoSuggestInput } from "../components/AutoSuggestInput";

export default function PublicForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const referrerId = searchParams.get("u");

  const [step, setStep] = useState(1);
  const [respondentData, setRespondentData] = useState({
    nome: '',
    bairro: '',
    telefone: '',
    sexo: '',
    faixa_etaria: '',
    renda: '',
    escolaridade: '',
    religiao: '',
    estado_civil: '',
    observacoes: '',
  });
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});
  
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  // Check if already responded via localStorage
  useEffect(() => {
    const hasResponded = localStorage.getItem(`survey_responded_${id}`);
    if (hasResponded) {
      setAlreadyResponded(true);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("GPS access denied for public user", err),
        { timeout: 5000 }
      );
    }
  }, [id]);

  const { data: survey, isLoading: isLoadingSurvey, isError: surveyError, refetch: retrySurvey } = useQuery({
    queryKey: ['survey_public', id],
    queryFn: () => surveyService.getById(id!),
    enabled: !!id,
  });

  const { data: demographicOptions } = useQuery({
    queryKey: ['demographic_options_public'],
    queryFn: () => surveyService.getDemographicOptions(),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => submissionService.save(data),
    onSuccess: (submission) => {
      if (submission.status_sincronizacao || !navigator.onLine) {
        localStorage.setItem(`survey_responded_${id}`, 'true');
        navigate('/p/sucesso');
        return;
      }

      setValidationAlert("Não foi possível enviar sua resposta agora. Ela foi salva neste dispositivo. Verifique sua conexão e tente novamente.");
    }
  });

  if (alreadyResponded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-on-surface">Você já respondeu!</h3>
        <p className="text-on-surface-variant text-sm mt-2 mb-8">Obrigado pela sua participação nesta pesquisa.</p>
      </div>
    );
  }

  if (isLoadingSurvey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">Carregando pesquisa...</p>
      </div>
    );
  }

  if (surveyError || !survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-on-surface">Não foi possível carregar a pesquisa</h3>
        <p className="text-on-surface-variant text-sm mt-2 mb-8">Verifique sua conexão ou tente novamente.</p>
        <button type="button" onClick={() => retrySurvey()} className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-white"><RefreshCw size={18} /> Tentar novamente</button>
      </div>
    );
  }

  if (!survey.permitir_link_publico) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-on-surface">Pesquisa Indisponível</h3>
        <p className="text-on-surface-variant text-sm mt-2">Esta pesquisa não está mais aceitando respostas via link público.</p>
      </div>
    );
  }

  const currentProgress = calculateFormProgress(
    respondentData,
    dynamicAnswers,
    survey.schema_dinamico.questions.length
  );

  const handleFinalize = () => {
    const unansweredQuestions = survey.schema_dinamico.questions.filter((q: any) => {
      const answer = dynamicAnswers[q.id];
      return q.required && (q.type === 'checkbox' ? !Array.isArray(answer) || answer.length === 0 : !answer);
    });
    
    if (unansweredQuestions.length > 0) {
      setValidationAlert(`Por favor, responda a pergunta: "${unansweredQuestions[0].label}"`);
      return;
    }

    submitMutation.mutate({
      formulario_id: id!,
      pesquisador_id: 'anonymous', // Explicit anonymous flag
      nome_entrevistado: respondentData.nome,
      bairro: respondentData.bairro,
      telefone: respondentData.telefone,
      dados_fixos: respondentData,
      respostas_dinamicas: dynamicAnswers,
      geolocalizacao: location || { lat: 0, lng: 0 },
      data_coleta: new Date().toISOString(),
      origem: 'web',
      referenciado_por: referrerId
    });
  };

  const handleNext = () => {
    const { nome, telefone, sexo, faixa_etaria, escolaridade, religiao, renda, estado_civil } = respondentData;
    
    if (!nome || !telefone || !sexo || !faixa_etaria || !escolaridade || !religiao || !renda || !estado_civil) {
      setValidationAlert("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }
    
    setStep(2);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface max-w-2xl mx-auto shadow-2xl">
      {/* Header Simplificado */}
      <div className="bg-white dark:bg-slate-950 h-20 flex items-center justify-center px-5 border-b border-outline sticky top-0 z-40">
        <h1 className="font-black text-primary text-xl uppercase tracking-tighter">{survey.nome}</h1>
      </div>

      <main className="px-5 pt-8 pb-32 w-full">
        {/* Progress Container */}
        <div className="sticky top-20 z-30 bg-surface/90 backdrop-blur-md -mx-5 px-5 py-4 mb-8 border-b border-outline">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              {step === 1 ? "Seus Dados" : "Perguntas"}
            </span>
            <span className="text-xs font-black text-primary">
              {currentProgress}% COMPLETO
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700" 
              style={{ width: `${currentProgress}%` }} 
            />
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-outline shadow-sm space-y-4">
              <h2 className="text-xl font-black text-on-surface mb-4">Dados de Identificação</h2>
              
              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Nome Completo *</label>
                <input 
                  className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all font-bold" 
                  placeholder="Como você gostaria de ser chamado?"
                  value={respondentData.nome}
                  onChange={(e) => setRespondentData({ ...respondentData, nome: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">WhatsApp / Telefone *</label>
                  <input 
                    className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold" 
                    placeholder="(00) 00000-0000"
                    value={respondentData.telefone}
                    onChange={(e) => setRespondentData({ ...respondentData, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Bairro *</label>
                  <input 
                    className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold" 
                    placeholder="Onde você mora?"
                    value={respondentData.bairro}
                    onChange={(e) => setRespondentData({ ...respondentData, bairro: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-outline shadow-sm space-y-4">
              <h2 className="text-xl font-black text-on-surface mb-4">Dados Demográficos</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Sexo *</label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                    value={respondentData.sexo}
                    onChange={(e) => setRespondentData({...respondentData, sexo: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'sexo').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Faixa Etária *</label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                    value={respondentData.faixa_etaria}
                    onChange={(e) => setRespondentData({...respondentData, faixa_etaria: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'faixa_etaria').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Escolaridade *</label>
                <select 
                  className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                  value={respondentData.escolaridade}
                  onChange={(e) => setRespondentData({...respondentData, escolaridade: e.target.value})}
                >
                  <option value="">Selecione</option>
                  {demographicOptions?.filter(o => o.categoria === 'escolaridade').map(opt => (
                    <option key={opt.id} value={opt.valor}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Religião *</label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                    value={respondentData.religiao}
                    onChange={(e) => setRespondentData({...respondentData, religiao: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'religiao').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Estado Civil *</label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                    value={respondentData.estado_civil}
                    onChange={(e) => setRespondentData({...respondentData, estado_civil: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'estado_civil').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-on-surface-variant uppercase mb-1.5 ml-1">Renda Domiciliar *</label>
                <select 
                  className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                  value={respondentData.renda}
                  onChange={(e) => setRespondentData({...respondentData, renda: e.target.value})}
                >
                  <option value="">Selecione</option>
                  {demographicOptions?.filter(o => o.categoria === 'renda').map(opt => (
                    <option key={opt.id} value={opt.valor}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <h2 className="text-2xl font-black text-on-surface mb-4 uppercase tracking-tighter">Perguntas</h2>
             {survey.schema_dinamico.questions.map((q: any) => (
                <div key={q.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-outline shadow-sm">
                  <p className="text-xl font-black text-on-surface mb-6 leading-tight">{q.label}</p>
                  
                  {q.type === 'radio' && (
                    <div className="space-y-3">
                       {q.options.map((opt: string) => (
                          <label key={opt} className={cn(
                            "flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all",
                            dynamicAnswers[q.id] === opt 
                              ? "bg-primary/5 border-primary text-primary" 
                              : "bg-slate-50 border-transparent text-on-surface-variant"
                          )}>
                            <input 
                              type="radio" 
                              className="hidden"
                              checked={dynamicAnswers[q.id] === opt}
                              onChange={() => setDynamicAnswers({ ...dynamicAnswers, [q.id]: opt })}
                            />
                             <span className="text-base font-black">{opt}</span>
                          </label>
                       ))}
                    </div>
                  )}

                  {q.type === 'checkbox' && (
                    <div className="space-y-3">
                      {q.options.map((opt: string) => {
                        const selectedOptions: string[] = Array.isArray(dynamicAnswers[q.id]) ? dynamicAnswers[q.id] : [];
                        const isSelected = selectedOptions.includes(opt);
                        
                        return (
                          <label key={opt} className={cn(
                            "flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary/20",
                            isSelected
                              ? "bg-primary/5 border-primary text-primary"
                              : "bg-slate-50 border-transparent text-on-surface-variant"
                          )}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isSelected}
                              onChange={() => {
                                const currentOptions: string[] = Array.isArray(dynamicAnswers[q.id]) ? dynamicAnswers[q.id] : [];
                                const nextOptions = currentOptions.includes(opt)
                                  ? currentOptions.filter((selectedOption) => selectedOption !== opt)
                                  : [...currentOptions, opt];
                                setDynamicAnswers({ ...dynamicAnswers, [q.id]: nextOptions });
                              }}
                            />
                            <span className={cn(
                              "mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                              isSelected ? "border-primary bg-primary text-white" : "border-outline bg-white dark:bg-slate-800"
                            )} aria-hidden="true">
                              {isSelected && <Check size={16} strokeWidth={3} />}
                            </span>
                            <span className="text-base font-black">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'text' && (
                    <input
                      className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold"
                      placeholder="Sua resposta..."
                      value={dynamicAnswers[q.id] || ""}
                      onChange={(e) => setDynamicAnswers({ ...dynamicAnswers, [q.id]: e.target.value })}
                    />
                  )}

                  {q.type === 'select' && (
                    <select 
                      className="w-full h-14 px-4 rounded-2xl border border-outline bg-slate-50 dark:bg-slate-800 font-bold appearance-none"
                      value={dynamicAnswers[q.id] || ""}
                      onChange={(e) => setDynamicAnswers({ ...dynamicAnswers, [q.id]: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {q.options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.type === 'scale' && (
                    <div className="flex justify-between gap-2">
                       {[1,2,3,4,5].map(v => (
                         <button 
                          key={v}
                          type="button"
                          onClick={() => setDynamicAnswers({ ...dynamicAnswers, [q.id]: v })}
                          className={cn(
                            "flex-1 aspect-square rounded-2xl border-2 flex items-center justify-center font-black text-xl transition-all",
                            dynamicAnswers[q.id] === v 
                              ? "bg-primary text-white border-primary" 
                              : "border-transparent bg-slate-50 text-on-surface-variant"
                          )}
                         >
                           {v}
                         </button>
                       ))}
                    </div>
                  )}
                </div>
             ))}
          </div>
        )}
      </main>

      {/* Footer Fixo */}
      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-24 bg-white/80 backdrop-blur-xl border-t border-outline px-5 flex items-center gap-4 z-50">
        {step === 2 && (
          <button 
            className="h-14 px-6 bg-slate-100 dark:bg-slate-800 text-on-surface rounded-2xl font-bold active:scale-95 transition-all"
            onClick={() => setStep(1)}
          >
            Voltar
          </button>
        )}
        <button 
          className="flex-1 h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          onClick={step === 1 ? handleNext : handleFinalize}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "Enviando..." : (
            step === 1 ? <>PRÓXIMO PASSO <ArrowRight size={20} /></> : <>FINALIZAR PESQUISA <CheckCircle size={20} /></>
          )}
        </button>
      </footer>

      {validationAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-on-surface mb-4">Quase lá!</h3>
            <p className="text-on-surface-variant mb-8 font-medium">{validationAlert}</p>
            <button 
              onClick={() => setValidationAlert(null)}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black"
            >
              OK, VOU CORRIGIR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
