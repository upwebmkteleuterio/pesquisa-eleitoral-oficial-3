export type SurveyStatus = "ativo" | "pausado" | "concluido";

export interface Researcher {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  foto_avatar_url?: string | null;
  foto_avatar_path?: string | null;
  usuario_id: string;
  role?: string;
}

export interface Client {
  id: string;
  nome: string;
  email: string;
  cpf?: string | null;
  nome_empresa?: string | null;
  pesquisa_ids?: string[];
  foto_avatar_url?: string | null;
  role: 'cliente';
}

export interface Region {
  id: string;
  estado: string;
  cidade: string;
}

export interface DemographicOption {
  id: number;
  categoria: string;
  label: string;
  valor: string;
}

export interface Survey {
  id: string;
  nome: string;
  regiao_id: string;
  status: SurveyStatus;
  limite_total: number;
  total_coletado: number;
  schema_dinamico: any;
  acesso_global?: boolean;
  permitir_link_publico?: boolean;
}

export interface SurveyOptionImage {
  id: string;
  pesquisa_id: string;
  pergunta_id: string;
  alternativa: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface Quota {
  id: string;
  formulario_id: string;
  campo_demografico: string;
  valor_opcao: string;
  quantidade_limite: number;
  quantidade_atual: number;
}

export interface SubmissionAudio {
  blob?: Blob;
  storage_path?: string;
  mime_type: string;
  duration_seconds: number;
  consent_at: string;
  consent_state: 'confirmed';
}

export type SubmissionProgressStage =
  | 'preparing-audio'
  | 'saving-local'
  | 'sending-responses'
  | 'sending-audio'
  | 'confirming'
  | 'complete';

export interface SubmissionProgress {
  stage: SubmissionProgressStage;
  percentage: number;
  label: string;
}

export type SubmissionProgressCallback = (progress: SubmissionProgress) => void;

export interface Submission {
  id: string;
  formulario_id: string;
  pesquisador_id: string;
  nome_entrevistado: string;
  bairro: string;
  telefone: string;
  dados_fixos: Record<string, string>;
  respostas_dinamicas: Record<string, any>;
  geolocalizacao: { lat: number; lng: number };
  data_coleta: string;
  status_sincronizacao: boolean;
  valida: boolean;
  origem?: 'app' | 'web';
  referenciado_por?: string;
  audio?: SubmissionAudio;
}

export interface SubmissionEdits {
  nome_entrevistado?: string;
  bairro?: string;
  telefone?: string;
  dados_fixos?: Record<string, string>;
  respostas_dinamicas?: Record<string, any>;
}

export type ReportDemographicField = "sexo" | "faixa_etaria" | "renda" | "escolaridade" | "religiao" | "estado_civil" | "bairro";

export interface ReportMergeConfig {
  id: string;
  pesquisa_id: string;
  campo_demografico: ReportDemographicField;
  pergunta_id: string;
  criado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportMergeBreakdown {
  label: string;
  total: number;
  percentage: number;
}

export interface ReportMergeAnswer {
  label: string;
  total: number;
  percentage: number;
  breakdown: ReportMergeBreakdown[];
}

export interface ReportMergeCardData {
  config: ReportMergeConfig;
  demographicLabel: string;
  questionLabel: string;
  totalResponses: number;
  totalAnswers: number;
  answers: ReportMergeAnswer[];
}

export interface ReportQuestionMergeConfig {
  id: string;
  pesquisa_id: string;
  nome: string;
  pergunta_ids: string[];
  criado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportQuestionMergeAnswer {
  label: string;
  total: number;
  percentage: number;
}

export interface ReportQuestionMergeCardData {
  config: ReportQuestionMergeConfig;
  questionLabels: string[];
  totalAnswers: number;
  answers: ReportQuestionMergeAnswer[];
}

export interface VirtualReportQuestionRef {
  pesquisa_id: string;
  pergunta_id: string;
}

export interface VirtualReportOptionRef extends VirtualReportQuestionRef {
  valor: string;
}

export interface VirtualReportOptionGroup {
  id: string;
  label: string;
  options: VirtualReportOptionRef[];
}

export interface VirtualReportCardConfig {
  id: string;
  position: number;
  sources: VirtualReportQuestionRef[];
  option_groups?: VirtualReportOptionGroup[];
  response_mappings?: Record<string, string>;
}

export interface VirtualReportAnswerOption {
  key: string;
  value: string;
  count: number;
  sourceLabel: string;
  questionLabel: string;
  ref: VirtualReportOptionRef;
  firstSeen: number;
}

export interface VirtualReportMergeConfig {
  id: string;
  nome: string;
  pesquisa_ids: string[];
  cards: VirtualReportCardConfig[];
  criado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VirtualReportAnswerSource {
  surveyName: string;
  questionLabel?: string;
}

export interface VirtualReportAnswer {
  label: string;
  total: number;
  percentage: number;
  displayLabel?: string;
  sources?: VirtualReportAnswerSource[];
}

export interface VirtualReportCardData {
  config: VirtualReportCardConfig;
  questionLabels: string[];
  surveyNames: string[];
  totalResponses: number;
  totalAnswers: number;
  answers: VirtualReportAnswer[];
}

export type TemporalGrouping = 'day' | 'week' | 'month';
export type TemporalDisplayMode = 'count' | 'percentage';
export type TemporalChartType = 'line' | 'bar';
export type TemporalDemographicField = 'none' | ReportDemographicField;

export interface TemporalQuestionDefinition {
  id: string;
  label: string;
  type: string;
  options?: Array<string | number>;
  option_aliases?: string[][];
  min?: number;
  max?: number;
  labels?: Record<string, string>;
}

export interface TemporalQuestionSource {
  surveyId: string;
  question: TemporalQuestionDefinition;
}

export interface TemporalQuestionGroup {
  id: string;
  key: string;
  label: string;
  sources: TemporalQuestionSource[];
}

export interface TemporalReportSource {
  surveyId: string;
  surveyName: string;
  regionLabel?: string;
  submissions: Submission[];
  question: TemporalQuestionDefinition;
}

export interface TemporalRegionalSlice {
  surveyId: string;
  surveyName: string;
  regionLabel?: string;
  count: number;
  percentage: number;
  total: number;
}

export interface TemporalReportFilters {
  questionId: string;
  answerValues: string[];
  startDate: string;
  endDate: string;
  grouping: TemporalGrouping;
  displayMode: TemporalDisplayMode;
  chartType: TemporalChartType;
  demographicField: TemporalDemographicField;
}

export type TemporalVariationDirection = 'up' | 'down' | 'stable';

export interface TemporalVariation {
  value: number;
  direction: TemporalVariationDirection;
}

export interface TemporalAnswerOption {
  value: string;
  label: string;
  color: string;
  aggregated?: boolean;
}

export interface TemporalDataPoint {
  period: string;
  label: string;
  total: number;
  values: Record<string, number>;
  percentages: Record<string, number>;
  variations: Record<string, TemporalVariation>;
  seriesTotals?: Record<string, number>;
}

export interface TemporalReportData {
  answerOptions: TemporalAnswerOption[];
  chartAnswerOptions?: TemporalAnswerOption[];
  detailAnswerOptions?: TemporalAnswerOption[];
  points: TemporalDataPoint[];
  totalResponses: number;
  regionalBreakdowns?: Record<string, TemporalRegionalSlice[]>;
}