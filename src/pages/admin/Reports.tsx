import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { surveyService } from "../../services/surveyService";
import { submissionService } from "../../services/submissionService";
import { responseMergeService } from "../../services/responseMergeService";
import { reportMergeService } from "../../services/reportMergeService";
import { surveyOptionImageService } from "../../services/surveyOptionImageService";
import { SurveyOptionImage } from "../../components/SurveyOptionImage";
import { ReportBarShape } from "../../components/admin/ReportBarShape";
import type { SurveyOptionImage as SurveyOptionImageMetadata } from "../../types";
import { findSurveyOptionImage } from "../../utils/surveyOptionImageUtils";
import { useAuth } from "../../contexts/AuthContext";
import { ResponseMergeModal, type ResponseMergeOption } from "../../components/admin/ResponseMergeModal";
import { ReportMergeActions } from "../../components/admin/ReportMergeActions";
import { ReportMergeList } from "../../components/admin/ReportMergeList";
import { ReportMergeModal } from "../../components/admin/ReportMergeModal";
import { VirtualReportCard } from "../../components/admin/VirtualReportCard";
import { VirtualReportJoinModal } from "../../components/admin/VirtualReportJoinModal";
import { VirtualReportNormalizeModal } from "../../components/admin/VirtualReportNormalizeModal";
import { VirtualReportConfigModal } from "../../components/admin/VirtualReportConfigModal";
import { SurveySelectionControl } from "../../components/admin/SurveySelectionControl";
import { TemporalReport } from "../../components/admin/TemporalReport";
import type { ReportDemographicField, ReportMergeConfig, VirtualReportCardConfig, VirtualReportMergeConfig, VirtualReportOptionGroup, VirtualReportQuestionRef } from "../../types";
import { virtualReportMergeService } from "../../services/virtualReportMergeService";
import { applyVirtualAnswerGroup, applyVirtualAnswerGroups, buildInitialVirtualCards, buildVirtualReportData, configToVirtualCards, getVirtualAnswerOptions, mergeVirtualCard, unmergeVirtualCard } from "../../utils/virtualReportUtils";
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon, Users,
  BarChart3, LayoutList, FileDown,
  GitMerge
} from "lucide-react";
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { cn } from "../../lib/utils";
import { generateReportPDF, generateReportMergesPDF, generateVirtualReportPDF } from "../../utils/pdfUtils";
import { aggregateQuestionResponses } from "../../utils/responseNormalization";
import { buildReportMergeCard, DEMOGRAPHIC_FIELD_LABELS, getDemographicValueLabel } from "../../utils/reportMergeUtils";

const COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

const normalizeImageLabel = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/\s+/g, ' ')
  .trim();

const virtualSelectionKey = (surveyIds: string[]) => surveyIds.join('|');
const virtualCardsMatch = (left: VirtualReportCardConfig[], right: VirtualReportCardConfig[]) => JSON.stringify(left) === JSON.stringify(right);

type ChartType = 'horizontal' | 'vertical' | 'pie';

function getTextResponseOptions(submissions: any[] | undefined, questionId: string): ResponseMergeOption[] {
  const counts = new Map<string, number>();

  submissions?.forEach((submission) => {
    const value = submission.respostas_dinamicas?.[questionId];
    if (typeof value === 'string' && value.trim().length > 0) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export default function Reports() {
  const [searchParams] = useSearchParams();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(() => searchParams.get('id') || "");
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>(() => {
    const id = searchParams.get('id');
    return id ? [id] : [];
  });
  const [pendingSurveyIds, setPendingSurveyIds] = useState<string[]>(() => {
    const id = searchParams.get('id');
    return id ? [id] : [];
  });
  const [surveySelectorOpen, setSurveySelectorOpen] = useState(false);
  const [openVirtualMenuId, setOpenVirtualMenuId] = useState<string | null>(null);
  const [virtualCards, setVirtualCards] = useState<VirtualReportCardConfig[]>([]);
  const [virtualJoinCard, setVirtualJoinCard] = useState<VirtualReportCardConfig | null>(null);
  const [virtualNormalizeCard, setVirtualNormalizeCard] = useState<VirtualReportCardConfig | null>(null);
  const [activeVirtualConfig, setActiveVirtualConfig] = useState<VirtualReportMergeConfig | null>(null);
  const [virtualConfigModal, setVirtualConfigModal] = useState<{ mode: "save" | "delete"; config?: VirtualReportMergeConfig } | null>(null);
  const [chartType, setChartType] = useState<ChartType>('horizontal');
  const [reportMode, setReportMode] = useState<'distribution' | 'temporal'>('distribution');
  const [temporalSurveyId, setTemporalSurveyId] = useState<string>(() => searchParams.get('id') || "");
  const [mergeQuestionId, setMergeQuestionId] = useState<string | null>(null);
  const [reportMergeModalOpen, setReportMergeModalOpen] = useState(false);
  const [editingReportMerge, setEditingReportMerge] = useState<ReportMergeConfig | null>(null);
  const { user, profile } = useAuth();

  const queryClient = useQueryClient();
  const isAdmin = !!user && profile?.role === 'admin';
  const isClient = profile?.role === 'cliente';
  const pendingVirtualCreatesRef = useRef(new Map<string, { cards: VirtualReportCardConfig[] }>());
  const currentSelectionKeyRef = useRef(virtualSelectionKey(selectedSurveyIds));
  currentSelectionKeyRef.current = virtualSelectionKey(selectedSurveyIds);

  const { data: surveys } = useQuery({
    queryKey: ['admin_surveys', user?.id || 'anonymous', profile?.role || 'unknown'],
    queryFn: () => surveyService.getAllForUser(user?.id, profile?.role),
    enabled: !!user,
  });

  useEffect(() => {
    if (!surveys) return;
    const requestedSurveyId = searchParams.get('id') || "";
    setSelectedSurveyId(currentId => {
      if (requestedSurveyId && surveys.some(survey => survey.id === requestedSurveyId)) return requestedSurveyId;
      if (profile?.role === 'cliente') return surveys[0]?.id || "";
      return requestedSurveyId || currentId;
    });
    setSelectedSurveyIds(currentIds => {
      const requestedIsAllowed = requestedSurveyId && surveys.some(survey => survey.id === requestedSurveyId);
      if (requestedIsAllowed && !currentIds.includes(requestedSurveyId)) return [requestedSurveyId];
      const allowed = currentIds.filter(id => surveys.some(survey => survey.id === id));
      if (allowed.length) return allowed;
      if (requestedIsAllowed) return [requestedSurveyId];
      return profile?.role === 'cliente' && surveys[0] ? [surveys[0].id] : [];
    });
  }, [searchParams, surveys, profile?.role]);

  useEffect(() => {
    if (!openVirtualMenuId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-virtual-menu]')) setOpenVirtualMenuId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openVirtualMenuId]);

  const selectedSurveys = useMemo(
    () => selectedSurveyIds.flatMap(id => {
      const survey = surveys?.find(item => item.id === id);
      return survey ? [survey] : [];
    }),
    [surveys, selectedSurveyIds],
  );
  const submissionQueries = useQueries({ queries: selectedSurveyIds.map(surveyId => ({
    queryKey: ['submissions', user?.id || 'anonymous', surveyId, 'valid', 'all'],
    queryFn: () => submissionService.getBySurveyIdAll(surveyId, true, isClient ? user?.id : undefined, isClient),
    enabled: !!user && (!isClient || surveys?.some(survey => survey.id === surveyId)),
  })) });
  const submissionsBySurvey = useMemo(() => Object.fromEntries(selectedSurveyIds.map((id, index) => [id, submissionQueries[index]?.data || []])), [selectedSurveyIds, submissionQueries]);
  const allVirtualSubmissions = useMemo(() => selectedSurveyIds.flatMap(id => submissionsBySurvey[id] || []), [selectedSurveyIds, submissionsBySurvey]);
  const isCombinedLoading = submissionQueries.some(query => query.isLoading);

  useEffect(() => {
    if (selectedSurveys.length === 0) {
      setVirtualCards([]);
      return;
    }
    setVirtualCards(current => {
      const selectedIds = new Set(selectedSurveyIds);
      const base = buildInitialVirtualCards(selectedSurveys);
      const kept = current.flatMap(card => {
        const sources = card.sources.filter(source => selectedIds.has(source.pesquisa_id));
        return sources.length ? [{ ...card, sources }] : [];
      });
      const currentKeys = new Set(kept.flatMap(card => card.sources.map(source => `${source.pesquisa_id}:${source.pergunta_id}`)));
      const additions = base.filter(card => !currentKeys.has(`${card.sources[0].pesquisa_id}:${card.sources[0].pergunta_id}`));
      const basePositions = new Map(base.map(card => [`${card.sources[0].pesquisa_id}:${card.sources[0].pergunta_id}`, card.position]));
      return [...kept, ...additions]
        .sort((left, right) => (basePositions.get(`${left.sources[0].pesquisa_id}:${left.sources[0].pergunta_id}`) ?? left.position) - (basePositions.get(`${right.sources[0].pesquisa_id}:${right.sources[0].pergunta_id}`) ?? right.position))
        .map((card, index) => ({ ...card, position: index }));
    });
  }, [selectedSurveyIds, selectedSurveys]);

  useEffect(() => {
    setMergeQuestionId(null);
    setReportMergeModalOpen(false);
    setEditingReportMerge(null);
    reportMergeMutation.reset();
    reportMergeDeleteMutation.reset();
  }, [selectedSurveyId]);

  const { data: submissions, isLoading: isSubmissionsLoading } = useQuery({
    queryKey: ['submissions', user?.id || 'anonymous', selectedSurveyId, 'valid', 'all'],
    queryFn: () => submissionService.getBySurveyIdAll(selectedSurveyId, true, profile?.role === 'cliente' ? user?.id : undefined, isClient),
    enabled: !!selectedSurveyId && (!isClient || surveys?.some(survey => survey.id === selectedSurveyId)),
  });
  const { data: surveyOptionImages = [] } = useQuery<SurveyOptionImageMetadata[]>({
    queryKey: ['survey-option-images', selectedSurveyId],
    queryFn: () => surveyOptionImageService.getForSurvey(selectedSurveyId),
    enabled: !!selectedSurveyId,
  });
  const { data: temporalOptionImages = [] } = useQuery<SurveyOptionImageMetadata[]>({
    queryKey: ['survey-option-images', temporalSurveyId],
    queryFn: () => surveyOptionImageService.getForSurvey(temporalSurveyId),
    enabled: reportMode === 'temporal' && !!temporalSurveyId && !!surveys?.some(survey => survey.id === temporalSurveyId),
  });
  const { data: temporalSubmissions, isLoading: isTemporalLoading, isError: isTemporalError, error: temporalError } = useQuery({
    queryKey: ['submissions', user?.id || 'anonymous', temporalSurveyId, 'valid', 'temporal'],
    queryFn: () => submissionService.getBySurveyIdAll(temporalSurveyId, true, profile?.role === 'cliente' ? user?.id : undefined, isClient),
    enabled: reportMode === 'temporal' && !!temporalSurveyId && (!isClient || surveys?.some(survey => survey.id === temporalSurveyId)),
  });
  const temporalSurvey = surveys?.find(survey => survey.id === temporalSurveyId);

  useEffect(() => {
    if (!temporalSurveyId && surveys?.length) setTemporalSurveyId(selectedSurveyId || surveys[0].id);
  }, [selectedSurveyId, surveys, temporalSurveyId]);

  const reportMergeQueryKey = ['report-merges', user?.id || 'anonymous', selectedSurveyId];
  const { data: reportMerges = [] } = useQuery({
    queryKey: reportMergeQueryKey,
    queryFn: () => reportMergeService.listReportMerges(selectedSurveyId),
    enabled: !!selectedSurveyId && !!user,
  });
  const { data: virtualConfigs = [], isLoading: virtualConfigsLoading } = useQuery({
    queryKey: ['virtual-report-merges', user?.id || 'anonymous'],
    queryFn: () => virtualReportMergeService.listVirtualReportMerges(),
    enabled: !!user,
  });

  const virtualReportCards = useMemo(
    () => buildVirtualReportData(virtualCards, selectedSurveys, submissionsBySurvey),
    [virtualCards, selectedSurveys, submissionsBySurvey],
  );
  const visibleVirtualConfigs = useMemo(() => {
    if (!isClient) return virtualConfigs;
    if (!surveys) return [];
    const allowedSurveyIds = new Set(surveys.map(survey => survey.id));
    return virtualConfigs.filter(config =>
      config.pesquisa_ids.every(id => allowedSurveyIds.has(id))
      && config.cards.every(card => card.sources.every(source => allowedSurveyIds.has(source.pesquisa_id))),
    );
  }, [isClient, surveys, virtualConfigs]);
  const virtualConfigMutation = useMutation({
    mutationFn: (input: {
      id?: string;
      nome: string;
      pesquisa_ids: string[];
      cards: VirtualReportCardConfig[];
      autoSave?: boolean;
      autoCreate?: boolean;
      selectionKey?: string;
    }) => {
      if (!isAdmin || !user) throw new Error("Apenas administradores autenticados podem salvar configurações virtuais.");
      const { id, autoSave: _autoSave, autoCreate: _autoCreate, selectionKey: _selectionKey, ...configInput } = input;
      return id
        ? virtualReportMergeService.updateVirtualReportMerge(id, configInput)
        : virtualReportMergeService.createVirtualReportMerge({ ...configInput, criado_por: user.id });
    },
    onSuccess: async (config, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['virtual-report-merges'] });
      if (variables.autoCreate && variables.selectionKey) {
        const pendingCreate = pendingVirtualCreatesRef.current.get(variables.selectionKey);
        if (!pendingCreate) return;
        pendingVirtualCreatesRef.current.delete(variables.selectionKey);
        if (currentSelectionKeyRef.current === variables.selectionKey) setActiveVirtualConfig(config);
        if (!virtualCardsMatch(pendingCreate.cards, variables.cards)) {
          virtualConfigMutation.mutate({
            id: config.id,
            nome: config.nome,
            pesquisa_ids: variables.pesquisa_ids,
            cards: pendingCreate.cards,
            autoSave: true,
            selectionKey: variables.selectionKey,
          });
        }
        return;
      }
      if (variables.autoSave) {
        if (variables.selectionKey === currentSelectionKeyRef.current) setActiveVirtualConfig(config);
        return;
      }
      setActiveVirtualConfig(config);
      setVirtualConfigModal(null);
    },
    onError: (_error, variables) => {
      if (variables.autoCreate && variables.selectionKey) pendingVirtualCreatesRef.current.delete(variables.selectionKey);
    },
  });
  const virtualDeleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!isAdmin || !user) throw new Error("Apenas administradores autenticados podem excluir configurações virtuais.");
      return virtualReportMergeService.deleteVirtualReportMerge(id);
    },
    onSuccess: async (_, id) => {
      setActiveVirtualConfig(current => current?.id === id ? null : current);
      setVirtualConfigModal(null);
      await queryClient.invalidateQueries({ queryKey: ['virtual-report-merges'] });
    },
  });

  const persistActiveVirtualCards = (cards: VirtualReportCardConfig[]) => {
    if (!isAdmin || !user || selectedSurveyIds.length < 2) return;
    const selectionKey = virtualSelectionKey(selectedSurveyIds);
    const pendingCreate = pendingVirtualCreatesRef.current.get(selectionKey);
    if (pendingCreate) {
      pendingCreate.cards = cards;
      return;
    }
    if (!activeVirtualConfig) return;
    const sameOrder = activeVirtualConfig.pesquisa_ids.length === selectedSurveyIds.length
      && activeVirtualConfig.pesquisa_ids.every((id, index) => id === selectedSurveyIds[index]);
    if (!sameOrder) return;
    virtualConfigMutation.mutate({
      id: activeVirtualConfig.id,
      nome: activeVirtualConfig.nome,
      pesquisa_ids: selectedSurveyIds,
      cards,
      autoSave: true,
      selectionKey,
    });
  };

  const validSubmissions = useMemo(
    () => submissions?.filter(submission => submission.valida !== false),
    [submissions],
  );

  const selectedSurvey = surveys?.find(survey => survey.id === selectedSurveyId);
  const mergeQuestion = selectedSurvey?.schema_dinamico?.questions?.find(
    (question: any) => question.id === mergeQuestionId,
  );
  const mergeOptions = mergeQuestionId
    ? getTextResponseOptions(validSubmissions, mergeQuestionId)
    : [];

  const mergeMutation = useMutation({
    mutationFn: ({ questionId, newResponse, oldValues }: { questionId: string; newResponse: string; oldValues: string[] }) =>
      responseMergeService.mergeManualSurveyResponses({
        p_pesquisa_id: selectedSurveyId,
        p_pergunta_id: questionId,
        p_nova_resposta: newResponse,
        p_valores_antigos: oldValues,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setMergeQuestionId(null);
    },
  });

  const reportMergeMutation = useMutation({
    mutationFn: async ({ id, campo_demografico, pergunta_id }: { id?: string; campo_demografico: ReportDemographicField; pergunta_id: string }) => {
      if (!selectedSurveyId || !user) throw new Error("Selecione uma pesquisa para mesclar os dados.");
      if (id) return reportMergeService.updateReportMerge(id, { campo_demografico, pergunta_id });
      return reportMergeService.createReportMerge({ pesquisa_id: selectedSurveyId, campo_demografico, pergunta_id, criado_por: user.id });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportMergeQueryKey });
      setReportMergeModalOpen(false);
      setEditingReportMerge(null);
    },
  });

  const reportMergeDeleteMutation = useMutation({
    mutationFn: (id: string) => reportMergeService.deleteReportMerge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportMergeQueryKey }),
  });

  const reportMergeCards = useMemo(
    () => reportMerges.map(config => buildReportMergeCard(config, selectedSurvey, validSubmissions || [])),
    [reportMerges, selectedSurvey, validSubmissions],
  );

  const handleOpenReportMerge = () => {
    if (!isAdmin) return;
    reportMergeMutation.reset();
    setEditingReportMerge(null);
    setReportMergeModalOpen(true);
  };

  const handleEditReportMerge = (config: ReportMergeConfig) => {
    if (!isAdmin) return;
    reportMergeMutation.reset();
    setEditingReportMerge(config);
    setReportMergeModalOpen(true);
  };

  const handleCloseReportMerge = () => {
    if (reportMergeMutation.isPending) return;
    setReportMergeModalOpen(false);
    setEditingReportMerge(null);
    reportMergeMutation.reset();
  };

  const handleConfirmReportMerge = (campo_demografico: ReportDemographicField, pergunta_id: string) => {
    reportMergeMutation.mutate({ id: editingReportMerge?.id, campo_demografico, pergunta_id });
  };

  const handleDeleteReportMerge = (config: ReportMergeConfig) => {
    const questionLabel = selectedSurvey?.schema_dinamico?.questions?.find(
      (question: any) => question.id === config.pergunta_id,
    )?.label || config.pergunta_id;
    const title = `${DEMOGRAPHIC_FIELD_LABELS[config.campo_demografico]} - ${questionLabel}`;
    if (!isAdmin || !window.confirm(`Excluir a mesclagem “${title}”?`)) return;
    reportMergeDeleteMutation.reset();
    reportMergeDeleteMutation.mutate(config.id);
  };

  const handleExportReportMerges = () => {
    if (selectedSurvey && reportMergeCards.length > 0) generateReportMergesPDF(selectedSurvey, reportMergeCards);
  };

  const handleOpenSurveySelection = () => {
    setPendingSurveyIds(selectedSurveyIds);
    setSurveySelectorOpen(true);
  };

  const handleTogglePendingSurvey = (surveyId: string) => {
    setPendingSurveyIds(current => current.includes(surveyId)
      ? current.filter(id => id !== surveyId)
      : [...current, surveyId]);
  };

  const handleCancelSurveySelection = () => {
    setSurveySelectorOpen(false);
    setPendingSurveyIds(selectedSurveyIds);
  };

  const handleConfirmSurveySelection = () => {
    const nextIds = [...pendingSurveyIds];
    const nextSurveys = nextIds.flatMap(id => {
      const survey = surveys?.find(item => item.id === id);
      return survey ? [survey] : [];
    });
    const selectionKey = virtualSelectionKey(nextIds);
    const savedConfig = nextIds.length > 1
      ? visibleVirtualConfigs.find(config => config.pesquisa_ids.length === nextIds.length && config.pesquisa_ids.every((id, index) => id === nextIds[index]))
        || (activeVirtualConfig?.pesquisa_ids.length === nextIds.length && activeVirtualConfig.pesquisa_ids.every((id, index) => id === nextIds[index]) ? activeVirtualConfig : undefined)
      : undefined;
    const pendingCreate = pendingVirtualCreatesRef.current.get(selectionKey);
    const nextCards = savedConfig
      ? configToVirtualCards(savedConfig)
      : pendingCreate?.cards || buildInitialVirtualCards(nextSurveys);
    currentSelectionKeyRef.current = selectionKey;
    setOpenVirtualMenuId(null);
    setSelectedSurveyIds(nextIds);
    setSelectedSurveyId(nextIds[0] || "");
    setVirtualCards(nextCards);
    setActiveVirtualConfig(savedConfig || null);
    setSurveySelectorOpen(false);
    if (!savedConfig && !pendingCreate && nextIds.length > 1 && isAdmin && user) {
      pendingVirtualCreatesRef.current.set(selectionKey, { cards: nextCards });
      virtualConfigMutation.mutate({
        nome: `Relatório virtual: ${nextSurveys.map(survey => survey.nome).join(" + ")}`,
        pesquisa_ids: nextIds,
        cards: nextCards,
        autoSave: true,
        autoCreate: true,
        selectionKey,
      });
    }
  };

  const handleJoinVirtualCard = (ref: VirtualReportQuestionRef) => {
    if (!virtualJoinCard) return;
    const nextCards = mergeVirtualCard(virtualCards, virtualJoinCard.id, ref);
    setVirtualCards(nextCards);
    persistActiveVirtualCards(nextCards);
    setVirtualJoinCard(null);
  };

  const handleNormalizeVirtualCard = (group: VirtualReportOptionGroup) => {
    if (!virtualNormalizeCard) return;
    const nextCards = applyVirtualAnswerGroup(virtualCards, virtualNormalizeCard.id, group);
    setVirtualCards(nextCards);
    persistActiveVirtualCards(nextCards);
    setVirtualNormalizeCard(null);
  };

  const handleAutoNormalizeVirtualCard = (groups: VirtualReportOptionGroup[]) => {
    if (!virtualNormalizeCard || groups.length === 0) return;
    const nextCards = applyVirtualAnswerGroups(virtualCards, virtualNormalizeCard.id, groups);
    setVirtualCards(nextCards);
    persistActiveVirtualCards(nextCards);
    setVirtualNormalizeCard(null);
  };

  const handleConfirmVirtualConfig = (name?: string) => {
    if (!virtualConfigModal || !isAdmin || !user) return;
    if (virtualConfigModal.mode === "delete") {
      if (virtualConfigModal.config) virtualDeleteMutation.mutate(virtualConfigModal.config.id);
      return;
    }
    if (!name?.trim() || selectedSurveyIds.length < 2) return;
    virtualConfigMutation.mutate({ id: activeVirtualConfig?.id, nome: name.trim(), pesquisa_ids: selectedSurveyIds, cards: virtualCards });
  };

  const handleLoadVirtualConfig = (config: VirtualReportMergeConfig) => {
    const allowedIds = config.pesquisa_ids.filter(id => surveys?.some(survey => survey.id === id));
    const hasOnlyAllowedSources = config.cards.every(card => card.sources.every(source => allowedIds.includes(source.pesquisa_id)));
    if (allowedIds.length < 2 || allowedIds.length !== config.pesquisa_ids.length || (isClient && !hasOnlyAllowedSources)) return;
    currentSelectionKeyRef.current = virtualSelectionKey(allowedIds);
    setSelectedSurveyIds(allowedIds);
    setSelectedSurveyId(allowedIds[0]);
    setVirtualCards(configToVirtualCards(config));
    setActiveVirtualConfig(config);
  };

  const handleDeleteVirtualConfig = (config: VirtualReportMergeConfig) => {
    if (!isAdmin) return;
    virtualDeleteMutation.reset();
    setVirtualConfigModal({ mode: "delete", config });
  };

  const handleUndoVirtualJoin = (card: VirtualReportCardConfig) => {
    const nextCards = unmergeVirtualCard(virtualCards, card.id, selectedSurveys);
    setVirtualCards(nextCards);
    persistActiveVirtualCards(nextCards);
  };

  const handleOpenMerge = (questionId: string) => {
    if (!isAdmin || selectedSurvey?.schema_dinamico?.questions?.find((question: any) => question.id === questionId)?.type !== 'text') return;
    mergeMutation.reset();
    setMergeQuestionId(questionId);
  };

  const handleCloseMerge = () => {
    if (mergeMutation.isPending) return;
    setMergeQuestionId(null);
    mergeMutation.reset();
  };

  const handleConfirmMerge = (newResponse: string, oldValues: string[]) => {
    if (!mergeQuestionId || !selectedSurveyId) return;
    mergeMutation.mutate({ questionId: mergeQuestionId, newResponse, oldValues });
  };

  const handleExportPDF = async () => {
    if (selectedSurveyIds.length > 1) {
      if (virtualReportCards.length > 0 && allVirtualSubmissions.length > 0) {
        await generateVirtualReportPDF(selectedSurveys, allVirtualSubmissions, virtualReportCards);
      }
      return;
    }
    if (!selectedSurvey || !validSubmissions?.length) return;
    await generateReportPDF(selectedSurvey, validSubmissions);
  };

  const stats = useMemo(() => {
    const reportSubmissions = selectedSurveyIds.length > 1 ? allVirtualSubmissions : validSubmissions || [];
    if (reportSubmissions.length === 0) return null;

    const demographicData: Record<string, any[]> = {};
    const dynamicData: Record<string, any[]> = {};

    ['sexo', 'faixa_etaria', 'renda', 'escolaridade', 'religiao', 'estado_civil'].forEach(key => {
      const counts: Record<string, number> = {};
      reportSubmissions.forEach(sub => {
        const val = sub.dados_fixos[key];
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      const readableCounts: Record<string, number> = {};
      Object.entries(counts).forEach(([name, value]) => {
        const readableName = getDemographicValueLabel(key as ReportDemographicField, name);
        readableCounts[readableName] = (readableCounts[readableName] || 0) + value;
      });
      demographicData[key] = Object.entries(readableCounts).map(([name, value]) => ({ name, value }));
    });

    if (selectedSurveyIds.length === 1) {
      const questions = selectedSurvey?.schema_dinamico?.questions || [];
      const questionById = new Map<string, any>(questions.map((question: any) => [question.id, question]));
      const dynamicResponses: Record<string, unknown[]> = {};
      reportSubmissions.forEach(sub => {
        Object.entries(sub.respostas_dinamicas || {}).forEach(([key, value]) => {
          if (!dynamicResponses[key]) dynamicResponses[key] = [];
          dynamicResponses[key].push(value);
        });
      });
      Object.entries(dynamicResponses).forEach(([key, responses]) => {
        const question = questionById.get(key);
        dynamicData[key] = aggregateQuestionResponses(question?.label || key, responses);
      });
    }

    return { total: reportSubmissions.length, demographicData, dynamicData };
  }, [allVirtualSubmissions, selectedSurveyIds, validSubmissions, selectedSurvey]);

  const renderChart = (data: any[], question?: { id: string; label?: string }) => {
    const chartData = data.map(item => ({
      ...item,
      image: findSurveyOptionImage(surveyOptionImages, question?.id, [String(item.name)]),
    }));
    if (chartType === 'horizontal') {
      return (
        <div className="space-y-4">
          {[...chartData].sort((a, b) => b.value - a.value).map((item, idx) => {
            const percent = (item.value / (stats?.total || 1)) * 100;
            const image = item.image;
            return (
              <div key={idx} className="space-y-3 rounded-[1.5rem] border border-transparent bg-slate-50 p-5 hover:border-primary/20 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex min-w-0 items-center gap-3 text-on-surface-variant">
                    {image && <SurveyOptionImage image={image} alt={`Imagem de ${item.name}`} className="h-10 w-10 shrink-0 rounded-xl border border-outline object-cover" />}
                    <span className="max-w-[200px] truncate">{item.name}</span>
                  </span>
                  <span className="text-white px-2.5 py-0.5 rounded-lg" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>{percent.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-outline">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${percent}%` }} 
                    className="h-full rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (chartType === 'vertical') {
      return (
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={chartData} margin={{ top: 56, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: 'rgba(5, 150, 105, 0.05)' }} 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
              />
              <Bar dataKey="value" data={chartData} shape={<ReportBarShape />}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-[400px] w-full flex flex-col relative">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie 
              data={data} 
              innerRadius={65} 
              outerRadius={95} 
              paddingAngle={5} 
              dataKey="value"
              cx="50%"
              cy="60%"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
            <Legend 
              verticalAlign="top" 
              align="center" 
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ 
                paddingBottom: '30px',
                fontSize: '11px', 
                fontWeight: '800',
                color: '#64748b',
                textTransform: 'uppercase'
              }}
            />
          </RePieChart>
        </ResponsiveContainer>
        <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-on-surface leading-none">{stats?.total}</span>
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white dark:bg-slate-900 border border-outline rounded-[3rem] shadow-sm">
        <div className="space-y-8 p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                 <PieChartIcon size={24} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none mb-1">Relatórios</h1>
                 <p className="text-on-surface-variant font-medium text-sm">Visualização dinâmica dos dados coletados</p>
               </div>
            </div>

            {reportMode === 'distribution' && <button
              type="button"
              onClick={handleExportPDF}
              disabled={selectedSurveyIds.length > 1
                ? !virtualReportCards.length || !allVirtualSubmissions.length
                : !selectedSurvey || validSubmissions === undefined || validSubmissions.length === 0}
              className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
              title={selectedSurveyIds.length > 1 ? "Exportar visão combinada em PDF" : "Exportar relatório em PDF"}
            >
              <FileDown size={20} />
              Exportar PDF
            </button>}
          </div>

          <div className="flex rounded-2xl border border-outline bg-slate-100 p-1.5 dark:bg-slate-800" role="tablist" aria-label="Modo do relatório">
            <button type="button" role="tab" aria-selected={reportMode === 'distribution'} onClick={() => setReportMode('distribution')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${reportMode === 'distribution' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-on-surface-variant'}`}>Distribuição</button>
            <button type="button" role="tab" aria-selected={reportMode === 'temporal'} onClick={() => setReportMode('temporal')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${reportMode === 'temporal' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-on-surface-variant'}`}>Evolução no tempo</button>
          </div>

          {reportMode === 'distribution' && <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <SurveySelectionControl
                surveys={surveys || []}
                selectedSurveyIds={selectedSurveyIds}
                pendingSurveyIds={pendingSurveyIds}
                isOpen={surveySelectorOpen}
                onOpen={handleOpenSurveySelection}
                onToggle={handleTogglePendingSurvey}
                onCancel={handleCancelSurveySelection}
                onConfirm={handleConfirmSurveySelection}
              />

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-outline">
                {[
                  { id: 'horizontal', icon: LayoutList },
                  { id: 'vertical', icon: BarChart3 },
                  { id: 'pie', icon: PieChartIcon }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id as ChartType)}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center justify-center",
                      chartType === type.id
                        ? "bg-white dark:bg-slate-900 text-primary shadow-md scale-110"
                        : "text-on-surface-variant opacity-40 hover:opacity-100"
                    )}
                    title={type.id}
                  >
                    <type.icon size={20} />
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center sm:w-auto sm:min-w-[10rem]" aria-live="polite">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">RESPOSTAS VÁLIDAS</p>
              <p className="mt-1 text-xl font-black text-on-surface">{isSubmissionsLoading || isCombinedLoading ? "..." : (selectedSurveyIds.length > 1 ? allVirtualSubmissions.length : validSubmissions?.length || 0)}</p>
            </div>
          </div>}
        </div>
      </div>

      {reportMode === 'distribution' ? <>
      {selectedSurveyIds.length <= 1 && visibleVirtualConfigs.length > 0 && <section className="rounded-[2rem] border border-primary/20 bg-primary/5 p-6" aria-label="Configurações virtuais permitidas"><div className="flex flex-wrap items-center gap-3"><p className="text-xs font-black uppercase tracking-widest text-primary">Configurações de relatório disponíveis</p>{visibleVirtualConfigs.map(config => <span key={config.id} className="inline-flex items-center gap-1"><button type="button" onClick={() => handleLoadVirtualConfig(config)} className="rounded-xl border border-outline bg-white px-3 py-2 text-xs font-black text-on-surface hover:border-primary dark:bg-slate-900">{config.nome}</button>{isAdmin && <button type="button" onClick={() => handleDeleteVirtualConfig(config)} className="rounded-lg px-2 py-2 text-xs font-black text-rose-700 hover:bg-rose-50 dark:text-rose-300" aria-label={`Excluir ${config.nome}`}>×</button>}</span>)}</div></section>}

      {selectedSurveyId ? (
        <div className="space-y-12">
          {selectedSurveyIds.length > 1 && stats && <section className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-outline shadow-sm space-y-12" aria-label="Perfil demográfico consolidado">
            <div className="flex items-center gap-3">
              <Users className="text-primary" size={28} />
              <h3 className="text-2xl font-black text-on-surface tracking-tight">Perfil Demográfico consolidado</h3>
            </div>
            <div className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
              {(Object.entries(stats.demographicData) as [string, any[]][]).map(([key, data]) => (
                <div key={key} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-b-2 border-primary/10 pb-3"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{DEMOGRAPHIC_FIELD_LABELS[key as ReportDemographicField]}</h4></div>
                  {renderChart(data)}
                </div>
              ))}
            </div>
          </section>}
          {selectedSurveyIds.length > 1 && <section className="space-y-6 rounded-[3rem] border border-primary/20 bg-primary/5 p-8" aria-label="Relatório combinado virtual">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="mt-1 text-2xl font-black text-on-surface">Pesquisas mescladas</h2></div><div className="flex flex-wrap gap-2"><span className="rounded-2xl border border-primary/20 bg-white px-4 py-3 text-xs font-black text-primary dark:bg-slate-900">{allVirtualSubmissions.length} respostas válidas somadas</span></div></div>
            {visibleVirtualConfigs.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-on-surface-variant">Configurações:</span>{visibleVirtualConfigs.map(config => <span key={config.id} className="inline-flex items-center gap-1"><button type="button" onClick={() => handleLoadVirtualConfig(config)} className="rounded-xl border border-outline bg-white px-3 py-2 text-xs font-black text-on-surface hover:border-primary dark:bg-slate-900">{config.nome}</button>{isAdmin && <button type="button" onClick={() => handleDeleteVirtualConfig(config)} className="rounded-lg px-2 py-2 text-xs font-black text-rose-700 hover:bg-rose-50 dark:text-rose-300" aria-label={`Excluir ${config.nome}`}>×</button>}</span>)}</div>}
            {virtualConfigsLoading && <p className="text-xs font-bold text-on-surface-variant">Carregando configurações salvas...</p>}
            {virtualConfigMutation.error instanceof Error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{virtualConfigMutation.error.message}</p>}
            {virtualDeleteMutation.error instanceof Error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{virtualDeleteMutation.error.message}</p>}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{virtualReportCards.map(card => <div key={card.config.id}><VirtualReportCard card={card} isAdmin={isAdmin} isMenuOpen={openVirtualMenuId === card.config.id} onToggleMenu={() => setOpenVirtualMenuId(current => current === card.config.id ? null : card.config.id)} onCloseMenu={() => setOpenVirtualMenuId(null)} onJoin={setVirtualJoinCard} onNormalize={setVirtualNormalizeCard} onUndo={handleUndoVirtualJoin} /></div>)}</div>
          </section>}
          {selectedSurveyIds.length === 1 && stats ? (
            <section className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-outline shadow-sm space-y-12">
              <div className="flex items-center gap-3">
                <Users className="text-primary" size={28} />
                <h3 className="text-2xl font-black text-on-surface tracking-tight">Perfil Demográfico</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-16 gap-x-12">
                {(Object.entries(stats.demographicData) as [string, any[]][]).map(([key, data]) => (
                  <div key={key} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="border-b-2 border-primary/10 pb-3"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{DEMOGRAPHIC_FIELD_LABELS[key as ReportDemographicField]}</h4></div>
                    {renderChart(data)}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-outline border-dashed">
              <p className="text-on-surface-variant font-bold">Nenhum dado coletado para esta pesquisa ainda.</p>
            </div>
          )}

          {selectedSurveyIds.length === 1 && <>
            <ReportMergeList
              cards={reportMergeCards}
              isAdmin={isAdmin}
              deleteError={reportMergeDeleteMutation.error instanceof Error ? reportMergeDeleteMutation.error.message : reportMergeDeleteMutation.error ? "Não foi possível excluir a mesclagem." : null}
              onEdit={handleEditReportMerge}
              onDelete={handleDeleteReportMerge}
            />
            <ReportMergeActions isAdmin={isAdmin} canExport={reportMergeCards.length > 0} onCreate={handleOpenReportMerge} onExport={handleExportReportMerges} />
          </>}

          {stats && Object.keys(stats.dynamicData).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {(Object.entries(stats.dynamicData) as [string, any[]][]).map(([key, data]) => {
                const question = selectedSurvey?.schema_dinamico?.questions?.find((item: any) => item.id === key);
                return (
                  <section key={key} className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-outline shadow-sm space-y-10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-start justify-between gap-4 border-b border-outline pb-6">
                      <h3 className="text-xl font-black text-on-surface leading-tight">{question?.label || key}</h3>
                      {isAdmin && question?.type === 'text' ? (
                        <button type="button" onClick={() => handleOpenMerge(key)} className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/10" title="Padronizar respostas" aria-label={`Padronizar respostas de ${question?.label || key}`}>
                          <GitMerge size={20} />Padronizar respostas
                        </button>
                      ) : (
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0 text-primary border border-primary/10"><BarChartIcon size={24} /></div>
                      )}
                    </div>
                    {renderChart(data, question)}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!selectedSurveyId && <div className="rounded-[3rem] border border-dashed border-outline bg-white py-20 text-center dark:bg-slate-900">
        <p className="text-lg font-black text-on-surface">Nenhuma pesquisa selecionada</p>
        <p className="mt-2 text-sm font-bold text-on-surface-variant">Abra o seletor acima e confirme uma ou mais pesquisas para visualizar o relatório.</p>
      </div>}
      </> : <TemporalReport
        surveys={surveys || []}
        surveyId={temporalSurveyId}
        survey={temporalSurvey}
        submissions={temporalSubmissions}
        optionImages={temporalOptionImages}
        isLoading={isTemporalLoading}
        error={isTemporalError ? (temporalError instanceof Error ? temporalError.message : "Não foi possível carregar as respostas.") : null}
        onSurveyChange={setTemporalSurveyId}
      />}

      <ReportMergeModal
        isOpen={isAdmin && reportMergeModalOpen}
        questions={selectedSurvey?.schema_dinamico?.questions || []}
        existingMerge={editingReportMerge}
        isSubmitting={reportMergeMutation.isPending}
        error={reportMergeMutation.error instanceof Error ? reportMergeMutation.error.message : reportMergeMutation.error ? "Não foi possível salvar a mesclagem." : null}
        onClose={handleCloseReportMerge}
        onConfirm={handleConfirmReportMerge}
      />

      <VirtualReportJoinModal
        isOpen={isAdmin && Boolean(virtualJoinCard)}
        card={virtualJoinCard}
        surveys={selectedSurveys}
        onClose={() => setVirtualJoinCard(null)}
        onConfirm={handleJoinVirtualCard}
      />
      <VirtualReportNormalizeModal
        isOpen={isAdmin && Boolean(virtualNormalizeCard)}
        card={virtualNormalizeCard}
        options={virtualNormalizeCard ? getVirtualAnswerOptions(virtualNormalizeCard, selectedSurveys, submissionsBySurvey) : []}
        onClose={() => setVirtualNormalizeCard(null)}
        onConfirm={handleNormalizeVirtualCard}
        onAutoConfirm={handleAutoNormalizeVirtualCard}
      />

      <VirtualReportConfigModal
        isOpen={isAdmin && Boolean(virtualConfigModal)}
        mode={virtualConfigModal?.mode || "save"}
        configName={virtualConfigModal?.config?.nome || ""}
        isSubmitting={virtualConfigModal?.mode === "delete" ? virtualDeleteMutation.isPending : virtualConfigMutation.isPending}
        error={virtualConfigModal?.mode === "delete"
          ? virtualDeleteMutation.error instanceof Error ? virtualDeleteMutation.error.message : null
          : virtualConfigMutation.error instanceof Error ? virtualConfigMutation.error.message : null}
        onClose={() => setVirtualConfigModal(null)}
        onConfirm={handleConfirmVirtualConfig}
      />

      <ResponseMergeModal
        isOpen={isAdmin && Boolean(mergeQuestion)}
        questionLabel={mergeQuestion?.label || ""}
        options={mergeOptions}
        isSubmitting={mergeMutation.isPending}
        error={mergeMutation.error instanceof Error ? mergeMutation.error.message : mergeMutation.error ? "Não foi possível mesclar as respostas." : null}
        onClose={handleCloseMerge}
        onConfirm={handleConfirmMerge}
      />
    </div>
  );
}