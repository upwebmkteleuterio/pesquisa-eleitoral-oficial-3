export type SurveyStatus = "ativo" | "pausado" | "concluido";

export interface Researcher {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  foto_avatar_url: string;
  usuario_id: string;
  role?: string;
}

export interface Client {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  foto_avatar_url?: string;
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