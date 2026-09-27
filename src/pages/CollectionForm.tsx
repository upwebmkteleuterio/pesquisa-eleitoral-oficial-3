import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../services/surveyService";
import { surveyOptionImageService } from "../services/surveyOptionImageService";
import { SubmissionPersistenceError, submissionService } from "../services/submissionService";
import { useCollectionStore } from "../store";
import { ArrowLeft, ArrowRight, CheckCircle, Camera, RefreshCw, AlertTriangle, MapPin, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { calculateFormProgress } from "../lib/progressUtils";
import { AutoSuggestInput } from "../components/AutoSuggestInput";
import { SurveyOptionImage } from "../components/SurveyOptionImage";
import { AudioConsentGate } from "../components/AudioConsentGate";
import { AudioRecordingSession, getAudioErrorMessage } from "../services/audioService";
import { SubmissionProgress } from "../types";
import { SubmissionProgressOverlay } from "../components/SubmissionProgressOverlay";
import { formatBrazilianPhone, isValidBrazilianPhone, normalizeBrazilianPhone, phoneValidationMessage } from "../utils/phoneUtils";

import { useAuth } from "../contexts/AuthContext";

export default function CollectionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    currentCollection,
    startCollection,
    updateRespondentData,
    updateDynamicAnswer,
    nextStep,
    prevStep,
    clearCollection
  } = useCollectionStore();

  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [quotaAlert, setQuotaAlert] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<Record<string, string[]>>({});
  const [audioSession, setAudioSession] = useState<AudioRecordingSession | null>(null);
  const [isWaitingAudio, setIsWaitingAudio] = useState(false);
  const [finalizationProgress, setFinalizationProgress] = useState<SubmissionProgress | null>(null);
  const [showPendingSyncModal, setShowPendingSyncModal] = useState(false);

  // Query otimizada: O surveyService agora tenta o cache primeiro
  const { data: survey, isLoading: isLoadingSurvey, isError: surveyError, refetch: retrySurvey } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveyService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5 // 5 minutos de cache em memória
  });

  const { data: optionImages = [] } = useQuery({
    queryKey: ['survey-option-images', id],
    queryFn: () => surveyOptionImageService.getForSurvey(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnReconnect: true
  });

  useEffect(() => {
    if (!id) return;
    const refreshOptionImages = () => {
      queryClient.invalidateQueries({ queryKey: ['survey-option-images', id] });
      queryClient.invalidateQueries({ queryKey: ['survey-option-image-bytes'] });
    };
    window.addEventListener('online', refreshOptionImages);
    return () => window.removeEventListener('online', refreshOptionImages);
  }, [id, queryClient]);

  const { data: demographicOptions } = useQuery({
    queryKey: ['demographic_options'],
    queryFn: () => surveyService.getDemographicOptions(),
    staleTime: 1000 * 60 * 30 // Opções demográficas mudam raramente
  });

  const { data: quotas } = useQuery({
    queryKey: ['quotas', id],
    queryFn: () => surveyService.getQuotas(id!),
    enabled: !!id
  });

  useEffect(() => {
    if (id && (!currentCollection || currentCollection.surveyId !== id)) {
      startCollection(id);
      setAudioSession(null);
    }
    
    // GPS Capture
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("GPS error", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // Carregar sugestões locais
    const loadSuggestions = async () => {
      if (survey?.schema_dinamico?.questions) {
        const suggs: Record<string, string[]> = {};
        for (const q of survey.schema_dinamico.questions) {
          if (q.type === 'text') {
            suggs[q.id] = await submissionService.getLocalSuggestions(q.id);
          }
        }
        setLocalSuggestions(suggs);
      }
    };
    loadSuggestions();
  }, [id, survey, currentCollection?.surveyId]);

  useEffect(() => {
    return () => {
      audioSession?.cancel();
    };
  }, [audioSession]);

  const validateQuotas = (category: string, value: string) => {
    const option = demographicOptions?.find(o => o.categoria === category && o.valor === value);
    if (!option) return true;

    const categoryMap: Record<string, string> = {
      "sexo": "Sexo",
      "faixa_etaria": "Faixa Etária",
      "renda": "Renda / Classe",
      "escolaridade": "Escolaridade",
      "religiao": "Religião",
      "estado_civil": "Estado Civil"
    };

    const quota = quotas?.find(q => q.campo_demografico === categoryMap[category] && q.valor_opcao === option.label);
    if (quota && quota.quantidade_atual >= quota.quantidade_limite) {
      setQuotaAlert(`${categoryMap[category]}: ${option.label}`);
      return false;
    }
    return true;
  };

  const handleRespondentChange = (field: string, value: string) => {
    const quotaFields = ["sexo", "faixa_etaria", "renda", "escolaridade", "religiao", "estado_civil"];
    
    if (quotaFields.includes(field)) {
      if (!validateQuotas(field, value)) return;
      setQuotaAlert(null);
    }
    updateRespondentData({ [field]: value });
  };

  const submitMutation = useMutation({
    mutationFn: (data: any) => submissionService.save(data, (progress) => setFinalizationProgress(progress)),
    onSuccess: (submission) => {
      setFinalizationProgress(null);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['surveys_list'] });
      queryClient.invalidateQueries({ queryKey: ['quotas', id] });

      if (submission.status_sincronizacao) {
        clearCollection();
        navigate('/success');
      } else {
        setShowPendingSyncModal(true);
      }
    },
    onError: (error) => {
      setFinalizationProgress(null);
      setValidationAlert(error instanceof SubmissionPersistenceError
        ? 'Não foi possível salvar a pesquisa neste dispositivo. Verifique o armazenamento disponível e tente novamente.'
        : 'Não foi possível concluir o salvamento da pesquisa. Nenhum envio foi confirmado pelo servidor.');
    }
  });

  if (isLoadingSurvey && !survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-bold text-on-surface">Preparando formulário...</h3>
        <p className="text-on-surface-variant text-sm mt-2">Carregando estrutura da pesquisa localmente</p>
      </div>
    );
  }

  if (surveyError || !survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-on-surface">Erro ao Carregar</h3>
        <p className="text-on-surface-variant text-sm mt-2 mb-8">Não foi possível carregar a estrutura desta pesquisa. Verifique sua conexão ou tente novamente.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retrySurvey()} className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-white"><RefreshCw size={18} /> Tentar novamente</button>
          <button type="button" onClick={() => navigate('/')} className="rounded-2xl border border-outline px-6 py-3 font-bold text-on-surface">Voltar para Início</button>
        </div>
      </div>
    );
  }

  if (!currentCollection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-10 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-on-surface">Erro ao Carregar</h3>
        <p className="text-on-surface-variant text-sm mt-2 mb-8">Não foi possível encontrar a coleta salva neste dispositivo.</p>
        <button type="button" onClick={() => navigate('/')} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold">Voltar para Início</button>
      </div>
    );
  }

  if (!audioSession) {
    return <AudioConsentGate onStart={setAudioSession} onBack={() => navigate(-1)} />;
  }

  const currentProgress = calculateFormProgress(
    currentCollection.respondentData,
    currentCollection.dynamicAnswers,
    survey.schema_dinamico.questions.length
  );

  const handleLeaveCollection = () => {
    audioSession.cancel();
    navigate(-1);
  };

  const handleStartNewCollection = () => {
    audioSession.cancel();
    clearCollection();
    setShowPendingSyncModal(false);
    navigate('/');
  };

  const handleFinalize = async () => {
    const unansweredQuestions = survey.schema_dinamico.questions.filter((q: any) => q.required && !currentCollection.dynamicAnswers[q.id]);
    
    if (unansweredQuestions.length > 0) {
      setValidationAlert(`Por favor, responda a pergunta: "${unansweredQuestions[0].label}"`);
      return;
    }

    setFinalizationProgress({ stage: 'preparing-audio', percentage: 10, label: 'Preparando áudio' });
    setIsWaitingAudio(true);
    let recordingResult;
    try {
      recordingResult = await audioSession.completed;
    } catch (recordingError) {
      setAudioSession(null);
      setIsWaitingAudio(false);
      setFinalizationProgress(null);
      setValidationAlert(getAudioErrorMessage(recordingError));
      return;
    }
    setIsWaitingAudio(false);

    submitMutation.mutate({
      formulario_id: id!,
      pesquisador_id: user?.id || 'anonymous',
      nome_entrevistado: currentCollection.respondentData.nome,
      bairro: currentCollection.respondentData.bairro,
      telefone: normalizeBrazilianPhone(currentCollection.respondentData.telefone),
      dados_fixos: { ...currentCollection.respondentData, telefone: normalizeBrazilianPhone(currentCollection.respondentData.telefone) },
      respostas_dinamicas: currentCollection.dynamicAnswers,
      geolocalizacao: location || { lat: 0, lng: 0 },
      data_coleta: new Date().toISOString(),
      audio: {
        blob: recordingResult.blob,
        mime_type: recordingResult.mimeType,
        duration_seconds: recordingResult.durationSeconds,
        consent_at: audioSession.consentAt,
        consent_state: 'confirmed'
      }
    });
  };

  const handleNext = () => {
    const { nome, telefone, sexo, faixa_etaria, escolaridade, religiao, renda, estado_civil } = currentCollection.respondentData;
    
    if (!nome || !telefone || !sexo || !faixa_etaria || !escolaridade || !religiao || !renda || !estado_civil) {
      setValidationAlert("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }
    if (!isValidBrazilianPhone(telefone)) {
      setValidationAlert(phoneValidationMessage);
      return;
    }
    
    nextStep();
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col -mx-5 min-h-[calc(100vh-4rem)] bg-surface text-on-surface">
      <div className="bg-surface h-16 flex items-center justify-between px-5 border-b border-outline sticky top-0 z-40">
        <button onClick={handleLeaveCollection} className="text-on-surface-variant hover:text-primary p-2 rounded-xl hover:bg-primary/5 transition-all"><ArrowLeft size={24} /></button>
        <span className="font-bold text-primary text-lg uppercase tracking-tight truncate max-w-[200px]">{survey.nome}</span>
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-wide">Áudio ativo</span>
        </div>
      </div>

      <main className="px-5 pt-8 pb-32 w-full">
        {/* Progress Container */}
        <div className="sticky top-16 z-30 bg-surface/80 backdrop-blur-md -mx-5 px-5 py-4 mb-8 border-b border-outline shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <span className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              {currentCollection.step === 1 ? "Dados Iniciais" : `Questão ${currentCollection.step - 1} de ${survey.schema_dinamico.questions.length}`}
            </span>
            <span className="text-sm font-black text-primary">
              {currentProgress}% Concluído
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
              style={{ width: `${currentProgress}%` }} 
            />
          </div>
        </div>

        {currentCollection.step === 1 ? (
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline space-y-6">
            <h2 className="text-2xl font-bold text-on-surface mb-4">Dados do Respondente</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Nome *</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all shadow-sm" 
                  placeholder="Seu nome completo"
                  value={currentCollection.respondentData.nome}
                  onChange={(e) => updateRespondentData({ nome: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Bairro / Comunidade (opcional)</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-outline bg-white dark:bg-slate-900 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all" 
                    placeholder="Digite ou selecione seu bairro"
                    value={currentCollection.respondentData.bairro}
                    onChange={(e) => updateRespondentData({ bairro: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Telefone / WhatsApp *</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-white dark:bg-slate-900 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all" 
                  placeholder="(96) 99999-9999"
                  value={formatBrazilianPhone(currentCollection.respondentData.telefone)}
                  onChange={(e) => updateRespondentData({ telefone: formatBrazilianPhone(e.target.value) })}
                  inputMode="numeric"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Faixa Etária *</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none appearance-none shadow-sm"
                    value={currentCollection.respondentData.faixa_etaria}
                    onChange={(e) => handleRespondentChange('faixa_etaria', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'faixa_etaria').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Sexo *</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none appearance-none shadow-sm"
                  value={currentCollection.respondentData.sexo}
                    onChange={(e) => handleRespondentChange('sexo', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'sexo').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Religião *</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none appearance-none shadow-sm"
                  value={currentCollection.respondentData.religiao}
                    onChange={(e) => handleRespondentChange('religiao', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'religiao').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Estado Civil *</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none appearance-none shadow-sm"
                  value={currentCollection.respondentData.estado_civil}
                    onChange={(e) => handleRespondentChange('estado_civil', e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {demographicOptions?.filter(o => o.categoria === 'estado_civil').map(opt => (
                      <option key={opt.id} value={opt.valor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Escolaridade *</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none appearance-none shadow-sm"
                  value={currentCollection.respondentData.escolaridade}
                  onChange={(e) => handleRespondentChange('escolaridade', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {demographicOptions?.filter(o => o.categoria === 'escolaridade').map(opt => (
                    <option key={opt.id} value={opt.valor}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Renda Domiciliar *</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none appearance-none shadow-sm"
                  value={currentCollection.respondentData.renda}
                  onChange={(e) => handleRespondentChange('renda', e.target.value)}
                >
                  <option value="">Selecione a faixa de renda</option>
                  {demographicOptions?.filter(o => o.categoria === 'renda').map(opt => (
                    <option key={opt.id} value={opt.valor}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Foto para identificação (opcional)</label>
                <button 
                  type="button"
                  onClick={() => setValidationAlert("Funcionalidade de câmera em desenvolvimento. Foto de teste capturada com sucesso!")}
                  className="w-full h-32 border-2 border-dashed border-outline rounded-2xl flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Camera size={32} />
                  <span className="text-sm font-medium">Abrir câmera para foto</span>
                </button>
              </div>

              <div className="pt-4">
                <label className="block text-xs text-on-surface-variant font-bold mb-2 uppercase tracking-wider">Localização GPS (automática)</label>
                <div className={cn(
                  "flex items-center justify-between p-5 rounded-2xl border transition-all",
                  location ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" : "bg-slate-50 dark:bg-slate-900 border-outline"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                      location ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400" : "bg-white dark:bg-slate-800 text-slate-300"
                    )}>
                      <CheckCircle size={28} />
                    </div>
                    <div className="text-sm">
                      {location ? (
                        <div className="leading-tight">
                          <span className="font-bold text-on-surface">Localização Ativa</span><br/>
                          <span className="font-mono text-xs text-on-surface-variant">
                            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-on-surface-variant">Aguardando sinal GPS...</span>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                        setLocation(null);
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                            (err) => console.error("GPS error", err),
                            { enableHighAccuracy: true }
                          );
                        }
                    }}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-outline hover:scale-105 active:scale-95 transition-all"
                  >
                    <RefreshCw size={20} className={cn(!location && "animate-spin text-primary")} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <h2 className="text-2xl font-bold text-on-surface mb-2 uppercase tracking-tight">Perguntas da Pesquisa</h2>
             {survey.schema_dinamico.questions.map((q: any) => (
                <div key={q.id} className="bg-surface rounded-2xl p-6 shadow-sm border border-outline">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase mb-4 inline-block tracking-wider">
                    {q.id.toUpperCase()}
                  </span>
                  <p className="text-xl font-bold text-on-surface mb-6 leading-tight">{q.label}</p>
                  
                  {q.type === 'radio' && (
                    <div className="space-y-3">
                       {q.options.map((opt: string) => (
                          <label key={opt} className={cn(
                            "flex items-center p-5 border rounded-2xl cursor-pointer transition-all shadow-sm",
                            currentCollection.dynamicAnswers[q.id] === opt 
                              ? "bg-primary/5 border-primary text-primary" 
                              : "bg-surface border-outline text-on-surface hover:border-primary/50"
                          )}>
                            <input 
                              type="radio" 
                              name={q.id} 
                              className="w-6 h-6 text-primary focus:ring-primary border-outline"
                              checked={currentCollection.dynamicAnswers[q.id] === opt}
                              onChange={() => updateDynamicAnswer(q.id, opt)}
                            />
                            <SurveyOptionImage
                              image={optionImages.find(image => image.pergunta_id === q.id && image.alternativa === opt)}
                              alt={`Imagem da alternativa ${opt}`}
                              className="ml-4 h-14 w-14 rounded-xl border border-outline object-cover"
                            />
                            <span className="ml-4 text-base font-bold">{opt}</span>
                         </label>
                      ))}
                   </div>
                 )}

                 {q.type === 'text' && (
                    <AutoSuggestInput 
                      placeholder="Toque para digitar sua resposta..."
                      value={currentCollection.dynamicAnswers[q.id] || ""}
                      onChange={(val) => updateDynamicAnswer(q.id, val)}
                      suggestions={localSuggestions[q.id] || []}
                    />
                  )}

                  {q.type === 'select' && (
                    <div className="relative">
                      <select 
                        className="w-full h-14 pl-4 pr-12 rounded-2xl border border-outline bg-surface text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none appearance-none shadow-sm transition-all"
                        value={currentCollection.dynamicAnswers[q.id] || ""}
                        onChange={(e) => updateDynamicAnswer(q.id, e.target.value)}
                      >
                        <option value="">Selecione uma opção</option>
                        {q.options.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={20} />
                    </div>
                  )}

                  {q.type === 'checkbox' && (
                    <div className="space-y-3">
                      {q.options.map((opt: string) => {
                        const currentValues = (currentCollection.dynamicAnswers[q.id] as string[]) || [];
                        const isChecked = currentValues.includes(opt);
                        
                        return (
                          <label key={opt} className={cn(
                            "flex items-center p-5 border rounded-2xl cursor-pointer transition-all shadow-sm",
                            isChecked ? "bg-primary/5 border-primary text-primary" : "bg-surface border-outline text-on-surface hover:border-primary/50"
                          )}>
                            <input 
                              type="checkbox"
                              className="w-6 h-6 rounded text-primary focus:ring-primary border-outline"
                              checked={isChecked}
                              onChange={() => {
                                const newValues = isChecked 
                                  ? currentValues.filter(v => v !== opt)
                                  : [...currentValues, opt];
                                updateDynamicAnswer(q.id, newValues);
                              }}
                            />
                            <SurveyOptionImage
                              image={optionImages.find(image => image.pergunta_id === q.id && image.alternativa === opt)}
                              alt={`Imagem da alternativa ${opt}`}
                              className="ml-4 h-14 w-14 rounded-xl border border-outline object-cover"
                            />
                            <span className="ml-4 text-base font-bold">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'scale' && (
                    <div className="flex justify-between gap-2 mt-4">
                       {[1,2,3,4,5].map(v => (
                         <button 
                          key={v}
                          type="button"
                          onClick={() => updateDynamicAnswer(q.id, v)}
                          className={cn(
                            "flex-1 aspect-square rounded-xl border flex items-center justify-center font-bold text-xl transition-all",
                            currentCollection.dynamicAnswers[q.id] === v 
                              ? "bg-primary text-white border-primary" 
                              : "border-outline text-on-surface-variant hover:border-primary"
                          )}
                         >
                           {v}
                         </button>
                       ))}
                    </div>
                  )}
                </div>
             ))}

             <div className="bg-surface rounded-xl p-6 shadow-sm border border-outline">
               <h3 className="text-lg font-bold text-on-surface mb-4">Observações adicionais</h3>
               <textarea 
                 className="w-full h-32 p-4 rounded-xl border border-outline bg-transparent text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary outline-none resize-none" 
                 placeholder="Digite aqui comentários relevantes coletados durante a entrevista..."
                 value={currentCollection.respondentData.observacoes}
                 onChange={(e) => updateRespondentData({ observacoes: e.target.value })}
               />
             </div>
          </div>
        )}
      </main>

      {/* Bottom Bar */}
      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-28 bg-surface border-t border-outline px-5 flex items-center gap-4 z-[60] shadow-2xl">
        <div className="w-full flex gap-4">
          <button 
            type="button"
            className="flex-1 h-16 bg-surface border border-outline rounded-2xl font-bold flex items-center justify-center gap-2 text-on-surface shadow-sm active:scale-95 transition-all"
            onClick={currentCollection.step === 1 ? handleLeaveCollection : prevStep}
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          <button
            type="button"
            className="flex-[2] h-16 bg-primary text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
            onClick={currentCollection.step === 1 ? handleNext : handleFinalize}
            disabled={submitMutation.isPending || isWaitingAudio}
          >
            {submitMutation.isPending ? "Salvando..." : isWaitingAudio ? "Concluindo áudio..." : (
              currentCollection.step === 1 ? (
                <>PRÓXIMO PASSO <ArrowRight size={20} /></>
              ) : (
                <>FINALIZAR PESQUISA <CheckCircle size={20} /></>
              )
            )}
          </button>
        </div>
      </footer>

      {finalizationProgress && (
        <SubmissionProgressOverlay progress={finalizationProgress} />
      )}

      {/* Pending Synchronization Modal */}
      {showPendingSyncModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-sync-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-outline bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-4 border-b border-outline bg-amber-50 p-6 dark:bg-amber-950/30">
              <AlertTriangle className="text-amber-500" size={32} aria-hidden="true" />
              <h3 id="pending-sync-title" className="text-xl font-bold text-on-surface">Pesquisa salva neste dispositivo</h3>
            </div>
            <div className="space-y-6 p-8">
              <p className="text-center font-medium text-on-surface-variant">
                Não houve confirmação de envio ao servidor. A pesquisa permanece salva neste dispositivo e será sincronizada automaticamente quando possível.
              </p>
              <button
                type="button"
                onClick={handleStartNewCollection}
                className="w-full rounded-2xl bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
              >
                Iniciar nova pesquisa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {validationAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-outline">
            <div className="bg-slate-50 dark:bg-slate-950 p-6 flex items-center gap-4 border-b border-outline">
              <AlertTriangle className="text-amber-500" size={32} />
              <h3 className="text-xl font-bold text-on-surface">Atenção</h3>
            </div>
            <div className="p-8 space-y-6">
               <p className="text-on-surface-variant font-medium text-center">{validationAlert}</p>
               <button 
                 onClick={() => setValidationAlert(null)}
                 className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
               >
                 Entendido
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Modal */}
      {quotaAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-error">
            <div className="bg-error/5 p-6 flex items-center gap-4">
              <AlertTriangle className="text-error" size={32} />
              <h3 className="text-xl font-bold text-error">Alerta de Cota</h3>
            </div>
            <div className="p-8 space-y-6">
               <p className="text-on-surface-variant">Este perfil já atingiu o limite de entrevistas permitido para este setor.</p>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col gap-2">
                 <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase">
                    <span>{quotaAlert}</span>
                    <span className="text-error">100% Completo</span>
                 </div>
                 <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-error w-full" />
                 </div>
               </div>
               <div className="flex gap-3">
                 <button 
                   onClick={() => setQuotaAlert(null)}
                   className="flex-1 py-4 rounded-xl border border-outline font-bold text-on-surface"
                 >
                   Corrigir
                 </button>
                 <button 
                   onClick={() => navigate('/')}
                   className="flex-1 py-4 bg-error text-white rounded-xl font-bold hover:brightness-110 transition-all"
                 >
                   Encerrar
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}