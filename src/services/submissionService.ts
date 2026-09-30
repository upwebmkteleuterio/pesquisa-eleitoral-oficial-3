import localforage from "localforage";
import { supabase } from "@/src/integrations/supabase/client";
import { getAudioExtension } from "./audioService";
import { Submission, SubmissionEdits, SubmissionProgress, SubmissionProgressCallback } from "../types";
import { normalizeBrazilianPhone } from "../utils/phoneUtils";

const SUBMISSIONS_KEY = "electoral_submissions";
const AUDIO_BUCKET = "submission-audio";
const scopedSubmissionsKey = (userId?: string) => userId ? `${SUBMISSIONS_KEY}_${userId}` : SUBMISSIONS_KEY;
const FIXED_FIELDS = ["sexo", "faixa_etaria", "escolaridade", "renda", "religiao", "estado_civil"] as const;

type SubmissionRecord = Record<string, any>;
type SyncResult = { successCount: number; failureCount: number; totalCount: number };
export type LocalAudioSubmission = { key: string; submission: Submission };

const RETRY_DELAYS_MS = [1000, 3000];
const SYNC_TIMEOUT_MS = 15_000;
const ADMIN_PAGE_SIZE = 50;
const COMPLETE_PAGE_SIZE = 1000;
const CLIENT_COLUMNS = 'id,pesquisa_id,pesquisador_id,nome_entrevistado,telefone,bairro,sexo,faixa_etaria,escolaridade,renda,religiao,respostas_dinamicas,geolocalizacao,data_coleta,created_at,estado_civil,origem,referenciado_por,audio_storage_path,audio_mime_type,audio_duration_seconds,audio_consent_at,audio_consent_state';
let activeSync: Promise<SyncResult> | null = null;

export interface SubmissionPage {
  data: Submission[];
  total: number;
}

export interface HistoryPageParams {
  startIso: string;
  endIso: string;
  searchTerm?: string;
  page: number;
}

export interface HistoryPage extends SubmissionPage {}

const safeResearcherId = (value?: string): string | null | undefined => {
  if (!value || value === 'todos') return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : undefined;
};

const safeSearchTerm = (value?: string): string => (value || '')
  .trim()
  .slice(0, 100)
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const validDateInput = (value: string): boolean => /^[0-9T:.+Z-]+$/.test(value) && !Number.isNaN(Date.parse(value));

const reportProgress = (onProgress: SubmissionProgressCallback | undefined, progress: SubmissionProgress) => {
  try {
    onProgress?.(progress);
  } catch {
    // Progress notifications must not change submission behavior.
  }
};

export class SubmissionPersistenceError extends Error {
  constructor(cause: unknown) {
    super('submission-local-persistence-failed', { cause });
    this.name = 'SubmissionPersistenceError';
  }
}

const createSyncTimeoutError = () => {
  const error = new Error('submission-sync-timeout');
  error.name = 'SubmissionSyncTimeoutError';
  return error;
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === 'number' ? status : Number(status) || undefined;
};

const isPermanentHttpError = (error: unknown): boolean => {
  const status = getHttpStatus(error);
  return status !== undefined && status >= 400 && status < 500;
};

const waitForRetry = (delayMs: number, signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (!navigator.onLine) {
    reject(new Error('offline'));
    return;
  }
  if (signal.aborted) {
    reject(signal.reason || createSyncTimeoutError());
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    window.removeEventListener('offline', handleOffline);
    signal.removeEventListener('abort', handleAbort);
  };
  const handleOffline = () => {
    clearTimeout(timeoutId);
    cleanup();
    reject(new Error('offline'));
  };
  const handleAbort = () => {
    clearTimeout(timeoutId);
    cleanup();
    reject(signal.reason || createSyncTimeoutError());
  };

  timeoutId = setTimeout(() => {
    cleanup();
    resolve();
  }, delayMs);
  window.addEventListener('offline', handleOffline);
  signal.addEventListener('abort', handleAbort, { once: true });
});

const withNetworkRetries = async <T>(operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!navigator.onLine) throw new Error('offline');
    if (signal.aborted) throw signal.reason || createSyncTimeoutError();

    try {
      const result = await operation(signal);
      if (!navigator.onLine) throw new Error('offline');
      if (signal.aborted) throw signal.reason || createSyncTimeoutError();
      return result;
    } catch (error) {
      if (attempt === 2 || isPermanentHttpError(error) || !navigator.onLine || signal.aborted) throw error;
      await waitForRetry(RETRY_DELAYS_MS[attempt], signal);
    }
  }

  throw new Error('sync-retries-exhausted');
};

const withSyncTimeout = async <T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timeoutError = createSyncTimeoutError();
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, SYNC_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timeoutId!);
    if (!controller.signal.aborted) controller.abort();
  }
};

const runExclusiveSync = (operation: () => Promise<SyncResult>): Promise<SyncResult> => {
  if (activeSync) return activeSync;

  const execution = operation();
  const trackedExecution = execution.finally(() => {
    if (activeSync === trackedExecution) activeSync = null;
  });
  activeSync = trackedExecution;
  return trackedExecution;
};

export const mapSubmission = (d: SubmissionRecord): Submission => ({
  id: d.id,
  formulario_id: d.pesquisa_id,
  pesquisador_id: d.pesquisador_id,
  nome_entrevistado: d.nome_entrevistado,
  bairro: d.bairro,
  telefone: d.telefone,
  dados_fixos: {
    sexo: d.sexo,
    faixa_etaria: d.faixa_etaria,
    escolaridade: d.escolaridade,
    renda: d.renda,
    religiao: d.religiao,
    estado_civil: d.estado_civil
  },
  respostas_dinamicas: d.respostas_dinamicas || {},
  geolocalizacao: d.geolocalizacao,
  data_coleta: d.data_coleta,
  status_sincronizacao: true,
  valida: d.valida ?? true,
  origem: d.origem,
  referenciado_por: d.referenciado_por,
  audio: d.audio_storage_path || d.audio_consent_at ? {
    storage_path: d.audio_storage_path,
    mime_type: d.audio_mime_type || 'audio/webm',
    duration_seconds: d.audio_duration_seconds || 30,
    consent_at: d.audio_consent_at,
    consent_state: d.audio_consent_state || 'confirmed'
  } : undefined
});

export const submissionService = {
  async getAll(userId?: string): Promise<Submission[]> {
    const cached = await localforage.getItem<Submission[]>(scopedSubmissionsKey(userId));
    return (cached || []).map(submission => ({ ...submission, valida: submission.valida ?? true }));
  },

  async getLocalAudioSubmissions(userId: string): Promise<LocalAudioSubmission[]> {
    const keys = Array.from(new Set([SUBMISSIONS_KEY, scopedSubmissionsKey(userId)]));
    const records: LocalAudioSubmission[] = [];

    for (const key of keys) {
      const cached = await localforage.getItem<Submission[]>(key);
      for (const submission of cached || []) {
        if (submission.pesquisador_id === userId && submission.audio?.blob instanceof Blob) {
          records.push({ key, submission });
        }
      }
    }

    return records;
  },

  async markAudioUploaded(userId: string, submissionId: string, storagePath: string): Promise<void> {
    const keys = Array.from(new Set([SUBMISSIONS_KEY, scopedSubmissionsKey(userId)]));

    for (const key of keys) {
      const cached = await localforage.getItem<Submission[]>(key);
      if (!cached) continue;

      const updated = cached.map(submission => {
        if (submission.id !== submissionId || submission.pesquisador_id !== userId || !submission.audio?.blob) {
          return submission;
        }

        return {
          ...submission,
          status_sincronizacao: true,
          audio: { ...submission.audio, blob: undefined, storage_path: storagePath }
        };
      });

      await localforage.setItem(key, updated);
    }
  },

  async getLocalSuggestions(questionId: string): Promise<string[]> {
    const submissions = await this.getAll();
    const values = submissions
      .map(s => s.respostas_dinamicas[questionId])
      .filter(v => typeof v === 'string' && v.trim().length > 0) as string[];

    return Array.from(new Set(values));
  },

  async getAllSynced(): Promise<Submission[]> {
    const pageSize = 1000;
    let pageStart = 0;
    const records: SubmissionRecord[] = [];

    while (true) {
      const { data, error } = await supabase
        .from('submissoes')
        .select('*')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(pageStart, pageStart + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      records.push(...data);
      if (data.length < pageSize) break;
      pageStart += pageSize;
    }

    return records.map(mapSubmission);
  },

  async save(submission: Omit<Submission, "id" | "status_sincronizacao" | "valida"> & { id?: string; valida?: boolean }, onProgress?: SubmissionProgressCallback): Promise<Submission> {
    const normalizedPhone = normalizeBrazilianPhone(submission.telefone);
    const newSubmission: Submission = {
      ...submission,
      telefone: normalizedPhone,
      dados_fixos: { ...submission.dados_fixos, telefone: normalizedPhone },
      id: submission.id || crypto.randomUUID(),
      status_sincronizacao: false,
      valida: submission.valida ?? true
    };

    reportProgress(onProgress, { stage: 'saving-local', percentage: 25, label: 'Salvando localmente' });
    try {
      const submissions = await this.getAll();
      await localforage.setItem(SUBMISSIONS_KEY, [newSubmission, ...submissions]);
    } catch (error) {
      throw new SubmissionPersistenceError(error);
    }

    if (!navigator.onLine) {
      reportProgress(onProgress, { stage: 'confirming', percentage: 90, label: 'Confirmando salvamento local' });
      return newSubmission;
    }

    try {
      await this.syncOne(newSubmission, onProgress);
      reportProgress(onProgress, { stage: 'complete', percentage: 100, label: 'Pesquisa concluída' });
      return { ...newSubmission, status_sincronizacao: true };
    } catch (error) {
      if (error instanceof SubmissionPersistenceError) throw error;
      reportProgress(onProgress, { stage: 'confirming', percentage: 90, label: 'Salvo, aguardando sincronização' });
      return newSubmission;
    }
  },

  async syncOne(submission: Submission, onProgress?: SubmissionProgressCallback): Promise<void> {
    await withSyncTimeout(async (signal) => {
      if (activeSync) {
        await activeSync;
        const current = (await this.getAll()).find(item => item.id === submission.id);
        if (!current || current.status_sincronizacao) return;
        submission = current;
      }

      await runExclusiveSync(async () => {
        await this.syncOneInternal(submission, signal, onProgress);
        return { successCount: 1, failureCount: 0, totalCount: 1 };
      });
    });
  },

  async syncOneInternal(submission: Submission, signal: AbortSignal, onProgress?: SubmissionProgressCallback): Promise<void> {
    if (!navigator.onLine) throw new Error('offline');

    const { dados_fixos, respostas_dinamicas, geolocalizacao, data_coleta, formulario_id, pesquisador_id, nome_entrevistado, bairro, telefone, origem, referenciado_por } = submission;
    const audioPath = submission.audio?.blob
      ? `${pesquisador_id}/${submission.id}.${getAudioExtension(submission.audio.mime_type)}`
      : submission.audio?.storage_path;
    const payload = {
      id: submission.id,
      pesquisa_id: formulario_id,
      pesquisador_id: pesquisador_id === 'anonymous' ? null : pesquisador_id,
      nome_entrevistado,
      telefone,
      bairro,
      sexo: dados_fixos.sexo,
      faixa_etaria: dados_fixos.faixa_etaria,
      escolaridade: dados_fixos.escolaridade,
      renda: dados_fixos.renda,
      religiao: dados_fixos.religiao,
      estado_civil: dados_fixos.estado_civil,
      respostas_dinamicas,
      geolocalizacao,
      data_coleta,
      valida: submission.valida ?? true,
      origem: origem || 'app',
      referenciado_por,
      audio_storage_path: audioPath,
      audio_mime_type: submission.audio?.mime_type,
      audio_duration_seconds: submission.audio?.duration_seconds,
      audio_consent_at: submission.audio?.consent_at,
      audio_consent_state: submission.audio?.consent_state
    };

    reportProgress(onProgress, { stage: 'sending-responses', percentage: 50, label: 'Enviando respostas' });
    await withNetworkRetries(async (requestSignal) => {
      const { error } = await supabase
        .from('submissoes')
        .upsert(payload, { onConflict: 'id' })
        .abortSignal(requestSignal);
      if (error) throw error;
    }, signal);

    if (submission.audio?.blob && audioPath) {
      reportProgress(onProgress, { stage: 'sending-audio', percentage: 75, label: 'Enviando áudio' });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== pesquisador_id) {
        throw new Error('audio-upload-not-authorized');
      }

      await withNetworkRetries(async () => {
        const { error: uploadError } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(audioPath, submission.audio!.blob!, { contentType: submission.audio!.mime_type, upsert: true });
        if (uploadError) throw uploadError;
      }, signal);
    }

    reportProgress(onProgress, { stage: 'confirming', percentage: 90, label: 'Confirmando envio' });
    try {
      const submissions = await this.getAll();
      const updated = submissions.map(s => s.id === submission.id
        ? { ...s, status_sincronizacao: true, audio: s.audio ? { ...s.audio, blob: undefined, storage_path: audioPath } : undefined }
        : s);
      await localforage.setItem(SUBMISSIONS_KEY, updated);
    } catch (error) {
      throw new SubmissionPersistenceError(error);
    }
  },

  async getAudioPlaybackUrl(submission: Submission): Promise<string> {
    const requestedPath = submission.audio?.storage_path;
    if (!requestedPath) throw new Error('audio-unavailable');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('not-authorized');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || !['admin', 'cliente'].includes(profile.role)) throw new Error('not-authorized');

    let submissionQuery = supabase
      .from('submissoes')
      .select('pesquisa_id,audio_storage_path,valida')
      .eq('id', submission.id);
    if (profile.role === 'cliente') submissionQuery = submissionQuery.eq('valida', true);
    const { data: record, error: submissionError } = await submissionQuery.maybeSingle();
    if (submissionError) throw submissionError;
    if (!record || record.audio_storage_path !== requestedPath || !record.audio_storage_path) throw new Error('audio-unavailable');

    if (profile.role === 'cliente') {
      if (record.valida !== true) throw new Error('not-authorized');
      const { data: link, error: linkError } = await supabase
        .from('pesquisa_clientes')
        .select('pesquisa_id')
        .eq('pesquisa_id', record.pesquisa_id)
        .eq('cliente_id', user.id)
        .maybeSingle();
      if (linkError || !link) throw new Error('not-authorized');
    }

    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(record.audio_storage_path, 300);
    if (error || !data?.signedUrl) throw error || new Error('audio-unavailable');
    return data.signedUrl;
  },

  async updateValidation(id: string, valida: boolean): Promise<Submission> {
    const { data, error } = await supabase
      .from('submissoes')
      .update({ valida })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const updated = mapSubmission(data);
    const submissions = await this.getAll();
    await localforage.setItem(SUBMISSIONS_KEY, submissions.map(submission =>
      submission.id === id ? { ...submission, valida } : submission
    ));
    return updated;
  },

  async deleteById(id: string, audioStoragePath?: string): Promise<void> {
    if (audioStoragePath) {
      const { error: audioError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .remove([audioStoragePath]);
      if (audioError) throw audioError;
    }

    const { error } = await supabase
      .from('submissoes')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;

    const submissions = await this.getAll();
    await localforage.setItem(SUBMISSIONS_KEY, submissions.filter(submission => submission.id !== id));
  },

  async updateById(id: string, edits: SubmissionEdits): Promise<Submission> {
    const payload: SubmissionRecord = {};
    if (edits.nome_entrevistado !== undefined) payload.nome_entrevistado = edits.nome_entrevistado;
    if (edits.bairro !== undefined) payload.bairro = edits.bairro;
    if (edits.telefone !== undefined) payload.telefone = normalizeBrazilianPhone(edits.telefone);
    if (edits.respostas_dinamicas !== undefined) payload.respostas_dinamicas = edits.respostas_dinamicas;
    if (edits.dados_fixos) {
      FIXED_FIELDS.forEach(field => {
        if (edits.dados_fixos?.[field] !== undefined) payload[field] = edits.dados_fixos[field];
      });
    }

    const { data, error } = await supabase
      .from('submissoes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const updated = mapSubmission(data);
    const submissions = await this.getAll();
    await localforage.setItem(SUBMISSIONS_KEY, submissions.map(submission =>
      submission.id === id ? updated : submission
    ));
    return updated;
  },

  async syncAll(): Promise<SyncResult> {
    if (activeSync) return activeSync;
    if (!navigator.onLine) return { successCount: 0, failureCount: 0, totalCount: 0 };

    return runExclusiveSync(async () => {
      const submissions = await this.getAll();
      const unsynced = submissions.filter((s) => !s.status_sincronizacao);
      let successCount = 0;
      let failureCount = 0;

      for (const [index, sub] of unsynced.entries()) {
        if (!navigator.onLine) {
          failureCount += unsynced.length - index;
          break;
        }

        try {
          await withSyncTimeout((signal) => this.syncOneInternal(sub, signal));
          successCount++;
        } catch (e) {
          failureCount++;
          if (!navigator.onLine) {
            failureCount += unsynced.length - index - 1;
            break;
          }
        }
      }

      return { successCount, failureCount, totalCount: unsynced.length };
    });
  },

  async getBySurveyIdPaged(
    surveyId: string,
    page: number,
    onlyValid = false,
    userId?: string,
    clientRead = false,
    researcherId?: string,
    searchTerm?: string,
  ): Promise<SubmissionPage> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeMemberId = safeResearcherId(researcherId);
    const search = safeSearchTerm(searchTerm);
    if (safeMemberId === undefined) return { data: [], total: 0 };

    if (navigator.onLine) {
      let query = supabase
        .from('submissoes')
        .select(clientRead ? CLIENT_COLUMNS : '*', { count: 'exact' })
        .eq('pesquisa_id', surveyId);
      if (onlyValid) query = query.eq('valida', true);
      if (safeMemberId) query = query.or(`pesquisador_id.eq.${safeMemberId},referenciado_por.eq.${safeMemberId}`);
      if (search) query = query.ilike('nome_entrevistado', `%${search}%`);

      const { data, count, error } = await query
        .order('data_coleta', { ascending: false })
        .order('id', { ascending: false })
        .range((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE - 1);
      if (!error && data) return { data: data.map(mapSubmission), total: count || 0 };
    }

    const normalizedSearch = search.toLocaleLowerCase();
    const local = await this.getBySurveyId(surveyId, onlyValid, userId, clientRead);
    const filtered = local.filter(submission =>
      (!safeMemberId || submission.pesquisador_id === safeMemberId || submission.referenciado_por === safeMemberId)
      && (!normalizedSearch || submission.nome_entrevistado?.toLocaleLowerCase().includes(normalizedSearch))
    );
    const sorted = [...filtered].sort((a, b) => new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime());
    const start = (safePage - 1) * ADMIN_PAGE_SIZE;
    return { data: sorted.slice(start, start + ADMIN_PAGE_SIZE), total: sorted.length };
  },

  async getBySurveyIdCount(
    surveyId: string,
    onlyValid = false,
    userId?: string,
    clientRead = false,
    researcherId?: string,
  ): Promise<number> {
    const safeMemberId = safeResearcherId(researcherId);
    if (safeMemberId === undefined) return 0;

    if (navigator.onLine) {
      let query = supabase
        .from('submissoes')
        .select('id', { count: 'exact', head: true })
        .eq('pesquisa_id', surveyId);
      if (onlyValid) query = query.eq('valida', true);
      if (safeMemberId) query = query.or(`pesquisador_id.eq.${safeMemberId},referenciado_por.eq.${safeMemberId}`);
      const { count, error } = await query;
      if (!error) return count || 0;
    }

    const local = await this.getAll(userId);
    return local.filter(submission => submission.formulario_id === surveyId
      && (!onlyValid || submission.valida !== false)
      && (!safeMemberId || submission.pesquisador_id === safeMemberId || submission.referenciado_por === safeMemberId)).length;
  },

  async getBySurveyIdAll(
    surveyId: string,
    onlyValid = false,
    userId?: string,
    clientRead = false,
    researcherId?: string,
  ): Promise<Submission[]> {
    const safeMemberId = safeResearcherId(researcherId);
    if (safeMemberId === undefined) return [];

    if (navigator.onLine) {
      const records: Submission[] = [];
      let pageStart = 0;
      let remoteFailed = false;

      while (true) {
        let query = supabase
          .from('submissoes')
          .select(clientRead ? CLIENT_COLUMNS : '*', { count: 'exact' })
          .eq('pesquisa_id', surveyId);
        if (onlyValid) query = query.eq('valida', true);
        if (safeMemberId) query = query.or(`pesquisador_id.eq.${safeMemberId},referenciado_por.eq.${safeMemberId}`);

        const { data, count, error } = await query
          .order('data_coleta', { ascending: false })
          .order('id', { ascending: false })
          .range(pageStart, pageStart + COMPLETE_PAGE_SIZE - 1);

        if (error || !data) {
          remoteFailed = true;
          break;
        }

        records.push(...data.map(mapSubmission));
        if (data.length === 0 || (count !== null && records.length >= count)) break;
        pageStart += COMPLETE_PAGE_SIZE;
      }

      if (!remoteFailed) {
        if (userId) {
          const cached = await localforage.getItem<Submission[]>(scopedSubmissionsKey(userId)) || [];
          const otherSurveySubmissions = cached.filter(submission => submission.formulario_id !== surveyId);
          await localforage.setItem(scopedSubmissionsKey(userId), [...records, ...otherSurveySubmissions]);
        }
        return records;
      }
    }

    const local = await this.getAll(userId);
    return local
      .filter(submission => submission.formulario_id === surveyId
        && (!onlyValid || submission.valida !== false)
        && (!safeMemberId || submission.pesquisador_id === safeMemberId || submission.referenciado_por === safeMemberId))
      .sort((left, right) => {
        const dateDifference = new Date(right.data_coleta).getTime() - new Date(left.data_coleta).getTime();
        return dateDifference || right.id.localeCompare(left.id);
      });
  },

  async getBySurveyIdFiltered(
    surveyId: string,
    onlyValid = false,
    userId?: string,
    clientRead = false,
    researcherId?: string,
  ): Promise<Submission[]> {
    return this.getBySurveyIdAll(surveyId, onlyValid, userId, clientRead, researcherId);
  },

  async getBySurveyId(surveyId: string, onlyValid = false, userId?: string, clientRead = false): Promise<Submission[]> {
    if (navigator.onLine) {
      let query = supabase
        .from('submissoes')
        .select(clientRead ? CLIENT_COLUMNS : '*')
        .eq('pesquisa_id', surveyId);

      if (onlyValid) query = query.eq('valida', true);

      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map(mapSubmission);
        if (userId) {
          const cached = await localforage.getItem<Submission[]>(scopedSubmissionsKey(userId)) || [];
          const otherSurveySubmissions = cached.filter(submission => submission.formulario_id !== surveyId);
          await localforage.setItem(scopedSubmissionsKey(userId), [...mapped, ...otherSurveySubmissions]);
        }
        return mapped;
      }
    }

    const local = await this.getAll(userId);
    return local.filter(s => s.formulario_id === surveyId && (!onlyValid || s.valida !== false));
  },

  async getHistoryPage(params: HistoryPageParams): Promise<HistoryPage> {
    const safePage = Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
    const startIso = validDateInput(params.startIso) ? params.startIso : new Date(0).toISOString();
    const endIso = validDateInput(params.endIso) ? params.endIso : new Date().toISOString();
    const search = safeSearchTerm(params.searchTerm);

    if (navigator.onLine) {
      let query = supabase
        .from('submissoes')
        .select('*', { count: 'exact' })
        .gte('data_coleta', startIso)
        .lte('data_coleta', endIso);
      if (search) query = query.or(`nome_entrevistado.ilike.%${search}%,bairro.ilike.%${search}%`);
      const { data, count, error } = await query
        .order('data_coleta', { ascending: false })
        .order('id', { ascending: false })
        .range((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE - 1);
      if (!error && data) return { data: data.map(mapSubmission), total: count || 0 };
    }

    const local = await this.getAll();
    const filtered = local
      .filter(submission => {
        const date = new Date(submission.data_coleta);
        const normalizedSearch = search.toLocaleLowerCase();
        return date >= new Date(startIso) && date <= new Date(endIso)
          && (!normalizedSearch
            || submission.nome_entrevistado?.toLocaleLowerCase().includes(normalizedSearch)
            || submission.bairro?.toLocaleLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime());
    const start = (safePage - 1) * ADMIN_PAGE_SIZE;
    return { data: filtered.slice(start, start + ADMIN_PAGE_SIZE), total: filtered.length };
  },

  async getHistoryByDate(dateStr: string): Promise<Submission[]> {
    const submissions = await this.getAll();
    return submissions.filter((s) => {
      try {
        const itemDate = new Date(s.data_coleta).toISOString().split('T')[0];
        return itemDate === dateStr;
      } catch (e) {
        return s.data_coleta.startsWith(dateStr);
      }
    });
  },

  async deleteBySurveyId(surveyId: string): Promise<void> {
    const submissions = await this.getAll();
    const updated = submissions.filter(s => s.formulario_id !== surveyId);
    await localforage.setItem(SUBMISSIONS_KEY, updated);
    await supabase.from('submissoes').delete().eq('pesquisa_id', surveyId);
  },

  async reassociateSubmissions(oldResearcherId: string, newResearcherId: string): Promise<void> {
    const { error } = await supabase
      .from('submissoes')
      .update({ pesquisador_id: newResearcherId })
      .eq('pesquisador_id', oldResearcherId);

    if (error) throw error;
  }
};

export type { SubmissionEdits } from "../types";
