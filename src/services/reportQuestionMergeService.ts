import { supabase } from "@/src/integrations/supabase/client";
import type { ReportQuestionMergeConfig } from "../types";

export interface ReportQuestionMergeInput {
  pesquisa_id: string;
  nome: string;
  pergunta_ids: string[];
  criado_por?: string | null;
}

const listReportQuestionMerges = async (pesquisaId: string): Promise<ReportQuestionMergeConfig[]> => {
  const { data, error } = await supabase
    .from("relatorio_pergunta_mesclagens")
    .select("*")
    .eq("pesquisa_id", pesquisaId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message || "Não foi possível carregar as mesclagens de perguntas.");
  return (data || []) as ReportQuestionMergeConfig[];
};

const createReportQuestionMerge = async (input: ReportQuestionMergeInput): Promise<ReportQuestionMergeConfig> => {
  const { data, error } = await supabase
    .from("relatorio_pergunta_mesclagens")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message || "Não foi possível salvar a mesclagem de perguntas.");
  return data as ReportQuestionMergeConfig;
};

const updateReportQuestionMerge = async (
  id: string,
  pesquisaId: string,
  input: Pick<ReportQuestionMergeInput, "nome" | "pergunta_ids">,
): Promise<ReportQuestionMergeConfig> => {
  const { data, error } = await supabase
    .from("relatorio_pergunta_mesclagens")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("pesquisa_id", pesquisaId)
    .select()
    .single();
  if (error) throw new Error(error.message || "Não foi possível atualizar a mesclagem de perguntas.");
  return data as ReportQuestionMergeConfig;
};

const deleteReportQuestionMerge = async (id: string, pesquisaId: string): Promise<void> => {
  const { error } = await supabase
    .from("relatorio_pergunta_mesclagens")
    .delete()
    .eq("id", id)
    .eq("pesquisa_id", pesquisaId);
  if (error) throw new Error(error.message || "Não foi possível excluir a mesclagem de perguntas.");
};

export const reportQuestionMergeService = {
  listReportQuestionMerges,
  createReportQuestionMerge,
  updateReportQuestionMerge,
  deleteReportQuestionMerge,
};
