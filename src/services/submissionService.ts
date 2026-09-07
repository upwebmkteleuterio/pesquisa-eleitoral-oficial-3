import localforage from "localforage";
import { supabase } from "@/src/integrations/supabase/client";
import { Submission } from "../types";

const SUBMISSIONS_KEY = "electoral_submissions";

export const submissionService = {
  async getAll(): Promise<Submission[]> {
    const cached = await localforage.getItem<Submission[]>(SUBMISSIONS_KEY);
    return cached || [];
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

    return data.map((d: any) => ({
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
      respostas_dinamicas: d.respostas_dinamicas,
      geolocalizacao: d.geolocalizacao,
      data_coleta: d.data_coleta,
      status_sincronizacao: true,
      origem: d.origem,
      referenciado_por: d.referenciado_por
    }));
  },

  async save(submission: Omit<Submission, "id" | "status_sincronizacao">): Promise<Submission> {
    const submissions = await this.getAll();
    const newSubmission: Submission = {
      ...submission,
      id: crypto.randomUUID(),
      status_sincronizacao: false
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
    const {
      dados_fixos,
      respostas_dinamicas,
      geolocalizacao,
      data_coleta,
      formulario_id,
      pesquisador_id,
      nome_entrevistado,
      bairro,
      telefone,
      origem,
      referenciado_por
    } = submission;

    const payload = {
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
      origem: origem || 'app',
      referenciado_por
    };

    const { error } = await supabase
      .from('submissoes')
      .insert(payload);

    if (error) throw error;

    const submissions = await this.getAll();
    const updated = submissions.map(s => 
      s.id === submission.id ? { ...s, status_sincronizacao: true } : s
    );
    await localforage.setItem(SUBMISSIONS_KEY, updated);
  },

  async syncAll(): Promise<{ successCount: number }> {
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

  async getBySurveyId(surveyId: string): Promise<Submission[]> {
    // Busca no servidor se estiver online
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('submissoes')
        .select('*')
        .eq('pesquisa_id', surveyId);
      
      if (!error && data) {
        return data.map((d: any) => ({
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
          respostas_dinamicas: d.respostas_dinamicas,
          geolocalizacao: d.geolocalizacao,
          data_coleta: d.data_coleta,
          status_sincronizacao: true,
          origem: d.origem,
          referenciado_por: d.referenciado_por
        }));
      }
    }

    // Fallback para dados locais caso esteja offline ou ocorra erro
    const local = await this.getAll();
    return local.filter(s => s.formulario_id === surveyId);
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