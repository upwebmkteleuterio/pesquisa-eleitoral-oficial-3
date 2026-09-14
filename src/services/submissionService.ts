import localforage from "localforage";
import { supabase } from "@/src/integrations/supabase/client";
import { getAudioExtension } from "./audioService";
import { Submission, SubmissionEdits } from "../types";

const SUBMISSIONS_KEY = "electoral_submissions";
const AUDIO_BUCKET = "submission-audio";
const scopedSubmissionsKey = (userId?: string) => userId ? `${SUBMISSIONS_KEY}_${userId}` : SUBMISSIONS_KEY;
const FIXED_FIELDS = ["sexo", "faixa_etaria", "escolaridade", "renda", "religiao", "estado_civil"] as const;

type SubmissionRecord = Record<string, any>;
type SyncResult = { successCount: number; failureCount: number; totalCount: number };
export type LocalAudioSubmission = { key: string; submission: Submission };

const RETRY_DELAYS_MS = [1000, 3000];
let activeSync: Promise<SyncResult> | null = null;

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

const waitForRetry = (delayMs: number): Promise<void> => new Promise((resolve, reject) => {
  if (!navigator.onLine) {
    reject(new Error('offline'));
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout>;
  const cleanup = () => window.removeEventListener('offline', handleOffline);
  const handleOffline = () => {
    clearTimeout(timeoutId);
    cleanup();
    reject(new Error('offline'));
  };

  timeoutId = setTimeout(() => {
    cleanup();
    resolve();
  }, delayMs);
  window.addEventListener('offline', handleOffline);
});

const withNetworkRetries = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!navigator.onLine) throw new Error('offline');

    try {
      const result = await operation();
      if (!navigator.onLine) throw new Error('offline');
      return result;
    } catch (error) {
      if (attempt === 2 || isPermanentHttpError(error) || !navigator.onLine) throw error;
      await waitForRetry(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error('sync-retries-exhausted');
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

  async save(submission: Omit<Submission, "id" | "status_sincronizacao" | "valida"> & { id?: string; valida?: boolean }): Promise<Submission> {
    const submissions = await this.getAll();
    const newSubmission: Submission = {
      ...submission,
      id: submission.id || crypto.randomUUID(),
      status_sincronizacao: false,
      valida: submission.valida ?? true
    };
    const updated = [newSubmission, ...submissions];
    await localforage.setItem(SUBMISSIONS_KEY, updated);

    if (!navigator.onLine) return newSubmission;

    try {
      await this.syncOne(newSubmission);
      return { ...newSubmission, status_sincronizacao: true };
    } catch (e) {
      console.warn("[submissionService] Sync failed, item kept local", e);
      return newSubmission;
    }
  },

  async syncOne(submission: Submission): Promise<void> {
    if (activeSync) {
      await activeSync;
      const current = (await this.getAll()).find(item => item.id === submission.id);
      if (!current || current.status_sincronizacao) return;
      submission = current;
    }

    await runExclusiveSync(async () => {
      await this.syncOneInternal(submission);
      return { successCount: 1, failureCount: 0, totalCount: 1 };
    });
  },

  async syncOneInternal(submission: Submission): Promise<void> {
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

    await withNetworkRetries(async () => {
      const { error } = await supabase.from('submissoes').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    });

    if (submission.audio?.blob && audioPath) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== pesquisador_id) {
        throw new Error('audio-upload-not-authorized');
      }

      await withNetworkRetries(async () => {
        const { error: uploadError } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(audioPath, submission.audio!.blob!, { contentType: submission.audio!.mime_type, upsert: true });
        if (uploadError) throw uploadError;
      });
    }

    const submissions = await this.getAll();
    const updated = submissions.map(s => s.id === submission.id
      ? { ...s, status_sincronizacao: true, audio: s.audio ? { ...s.audio, blob: undefined, storage_path: audioPath } : undefined }
      : s);
    await localforage.setItem(SUBMISSIONS_KEY, updated);
  },

  async getAudioPlaybackUrl(submission: Submission): Promise<string> {
    if (!submission.audio?.storage_path) throw new Error('audio-unavailable');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('not-authorized');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError || profile?.role !== 'admin') throw new Error('not-authorized');
    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(submission.audio.storage_path, 300);
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
    if (edits.telefone !== undefined) payload.telefone = edits.telefone;
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
          await this.syncOneInternal(sub);
          successCount++;
        } catch (e) {
          failureCount++;
          console.error(`[submissionService] Failed to sync submission ${sub.id}`, e);
          if (!navigator.onLine) {
            failureCount += unsynced.length - index - 1;
            break;
          }
        }
      }

      return { successCount, failureCount, totalCount: unsynced.length };
    });
  },

  async getBySurveyId(surveyId: string, onlyValid = false, userId?: string, clientRead = false): Promise<Submission[]> {
    if (navigator.onLine) {
      const clientColumns = 'id,pesquisa_id,pesquisador_id,nome_entrevistado,telefone,bairro,sexo,faixa_etaria,escolaridade,renda,religiao,respostas_dinamicas,geolocalizacao,data_coleta,created_at,estado_civil,origem,referenciado_por,audio_storage_path,audio_mime_type,audio_duration_seconds,audio_consent_at,audio_consent_state';
      let query = supabase
        .from('submissoes')
        .select(clientRead ? clientColumns : '*')
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
