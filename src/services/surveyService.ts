import localforage from "localforage";
import { supabase } from "@/src/integrations/supabase/client";
import { Survey, Quota, DemographicOption, Region } from "../types";

const SURVEYS_KEY = "electoral_surveys";
const REGIONS_KEY = "electoral_regions";
const OPTIONS_KEY = "electoral_demographic_options";
const QUOTAS_PREFIX = "quotas_";

export const surveyService = {
  // REGIONS
  async getRegions(): Promise<Region[]> {
    if (!navigator.onLine) {
      const cached = await localforage.getItem<Region[]>(REGIONS_KEY);
      return cached || [];
    }

    const { data, error } = await supabase
      .from('regioes')
      .select('*')
      .order('cidade', { ascending: true });
    
    if (error) throw error;
    await localforage.setItem(REGIONS_KEY, data);
    return data;
  },

  async saveRegion(region: Partial<Region>): Promise<Region> {
    const { data, error } = await supabase
      .from('regioes')
      .upsert(region)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteRegion(id: string): Promise<void> {
    const { error } = await supabase
      .from('regioes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // SURVEYS
  async getAll(): Promise<Survey[]> {
    // Se estiver offline, retorna apenas o que está no cache
    if (!navigator.onLine) {
      const cached = await localforage.getItem<Survey[]>(SURVEYS_KEY);
      return cached || [];
    }

    try {
      const { data, error } = await supabase
        .from('pesquisas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Atualiza o cache da lista principal
      await localforage.setItem(SURVEYS_KEY, data);

      // Em paralelo, garante que os detalhes e as cotas de cada pesquisa também estejam em cache
      data.forEach(async (survey: Survey) => {
        await localforage.setItem(`survey_detail_${survey.id}`, survey);
        // Baixa as cotas silenciosamente
        this.getQuotas(survey.id);
      });

      return data as any;
    } catch (e) {
      const cached = await localforage.getItem<Survey[]>(SURVEYS_KEY);
      return cached || [];
    }
  },

  async getById(id: string): Promise<Survey | undefined> {
    // Tenta primeiro o cache local para velocidade instantânea
    const cached = await localforage.getItem<Survey>(`survey_detail_${id}`);
    
    if (!navigator.onLine) {
      return cached || undefined;
    }

    try {
      const { data, error } = await supabase
        .from('pesquisas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return cached || undefined;
      
      // Atualiza o cache com a versão mais nova da rede
      await localforage.setItem(`survey_detail_${id}`, data);
      return data as any;
    } catch (e) {
      return cached || undefined;
    }
  },

  async save(survey: Partial<Survey> & { researchers?: string[] }): Promise<Survey> {
    const { researchers, ...surveyData } = survey;
    
    // Remove total_coletado as it's a computed field and doesn't exist in the DB table
    const { total_coletado, ...dataToSave } = surveyData as any;

    // Ensure boolean fields are handled correctly
    const payload = {
      ...dataToSave,
      acesso_global: dataToSave.acesso_global ?? true,
      permitir_link_publico: dataToSave.permitir_link_publico ?? false
    };

    const { data, error } = await supabase
      .from('pesquisas')
      .upsert(payload)
      .select()
      .single();
    
    if (error) throw error;

    if (researchers) {
      await supabase.from('pesquisa_pesquisadores').delete().eq('pesquisa_id', data.id);
      if (researchers.length > 0) {
        const links = researchers.map(rid => ({ pesquisa_id: data.id, pesquisador_id: rid }));
        await supabase.from('pesquisa_pesquisadores').insert(links);
      }
    }

    return data as any;
  },

  async duplicate(id: string): Promise<Survey> {
    const survey = await this.getById(id);
    if (!survey) throw new Error("Pesquisa não encontrada");

    const { id: _, created_at, ...surveyData } = survey as any;
    const newSurvey = {
      ...surveyData,
      nome: `${survey.nome} (Cópia)`,
      total_coletado: 0,
      status: 'pausado',
    };

    return await this.save(newSurvey);
  },

  async updateStatus(id: string, status: 'ativo' | 'pausado' | 'concluido'): Promise<void> {
    const { error } = await supabase
      .from('pesquisas')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pesquisas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await localforage.removeItem(`survey_detail_${id}`);
    await localforage.removeItem(`${QUOTAS_PREFIX}${id}`);
  },

  // QUOTAS
  async getQuotas(surveyId: string): Promise<Quota[]> {
    const cacheKey = `${QUOTAS_PREFIX}${surveyId}`;
    const cached = await localforage.getItem<Quota[]>(cacheKey);

    if (!navigator.onLine) {
      return cached || [];
    }

    try {
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .eq('pesquisa_id', surveyId);
      
      if (error) return cached || [];

      await localforage.setItem(cacheKey, data);
      return data as any;
    } catch (e) {
      return cached || [];
    }
  },

  async saveQuotas(surveyId: string, quotas: Quota[]): Promise<void> {
    await supabase.from('cotas').delete().eq('pesquisa_id', surveyId);
    
    const quotasToInsert = quotas.map(({ id, ...q }) => ({
      ...q,
      pesquisa_id: surveyId
    }));

    if (quotasToInsert.length > 0) {
      const { error } = await supabase.from('cotas').insert(quotasToInsert);
      if (error) throw error;
    }
    // Limpa cache para forçar recarregamento
    await localforage.removeItem(`${QUOTAS_PREFIX}${surveyId}`);
  },

  // DEMOGRAPHIC OPTIONS
  async getDemographicOptions(): Promise<DemographicOption[]> {
    const cached = await localforage.getItem<DemographicOption[]>(OPTIONS_KEY);

    if (!navigator.onLine) {
      return cached || [];
    }

    try {
      const { data, error } = await supabase
        .from('opcoes_demograficas')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) return cached || [];
      await localforage.setItem(OPTIONS_KEY, data);
      return data;
    } catch (e) {
      return cached || [];
    }
  }
};