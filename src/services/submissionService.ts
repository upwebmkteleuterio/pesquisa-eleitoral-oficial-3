import localforage from "localforage";
import { supabase } from "@/src/integrations/supabase/client";
import { getAudioExtension } from "./audioService";
import { Submission, SubmissionEdits } from "../types";

const SUBMISSIONS_KEY = "electoral_submissions";
const AUDIO_BUCKET = "submission-audio";
const FIXED_FIELDS = ["sexo", "faixa_etaria", "escolaridade", "renda", "religiao", "estado_civil"] as const;

type SubmissionRecord = Record<string, any>;

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
  async getAll(): Promise<Submission[]> {
    const cached = await localforage.getItem<Submission[]>(SUBMISSIONS_KEY);
    return (cached || []).map(submission => ({ ...submission, valida: submission.valida ?? true }));
  },

  async getLocalSuggestions(questionId: string): Promise<string[]> {
    const submissions = await this.getAll();
    const values = submissions
      .map(s => s.respostas_dinamicas[questionId])
      .filter(v => typeof v === 'string' && v.trim().length > 0) as string[];

    return Array.from(new Set(values));
  },

  async getAllSynced(): Promise<Submission[]> {
    const { data, error } = await supabase
      .from('submissoes')
      .select('*');

    if (error) throw error;

    return data.map(mapSubmission);
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

    if (navigator.onLine) {
      try {
        await this.syncOne(newSubmission);
      } catch (e) {
        console.warn("[submissionService] Sync failed, item kept local", e);
      }
    }

    return newSubmission;
  },

  async syncOne(submission: Submission): Promise<void> {
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

    const { error } = await supabase.from('submissoes').upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    if (submission.audio?.blob && audioPath) {
      const { error: uploadError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(audioPath, submission.audio.blob, { contentType: submission.audio.mime_type, upsert: true });
      if (uploadError) throw uploadError;
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

  async syncAll(): Promise<{ successCount: number }> {
    if (!navigator.onLine) return { successCount: 0 };
    const submissions = await this.getAll();
    const unsynced = submissions.filter((s) => !s.status_sincronizacao);

    let successCount = 0;
    for (const sub of unsynced) {
      try {
        await this.syncOne(sub);
        successCount++;
      } catch (e) {
        console.error(`[submissionService] Failed to sync submission ${sub.id}`, e);
      }
    }

    return { successCount };
  },

  async getBySurveyId(surveyId: string, onlyValid = false): Promise<Submission[]> {
    if (navigator.onLine) {
      let query = supabase
        .from('submissoes')
        .select('*')
        .eq('pesquisa_id', surveyId);

      if (onlyValid) query = query.eq('valida', true);

      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapSubmission);
      }
    }

    const local = await this.getAll();
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
