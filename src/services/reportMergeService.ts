import { supabase } from "@/src/integrations/supabase/client";
import type { ReportDemographicField, ReportMergeConfig } from "../types";

export interface ReportMergeInput {
  pesquisa_id: string;
  campo_demografico: ReportDemographicField;
  pergunta_id: string;
  criado_por?: string | null;
}

const getFriendlyError = (error: { code?: string; message?: string }) => {
  if (error.code === "23505" || error.message?.toLowerCase().includes("unique")) {
    return new Error("Essa combinação de campo demográfico e pergunta já foi adicionada.");
  }
  return new Error(error.message || "Não foi possível salvar a mesclagem.");
};

const listReportMerges = async (pesquisaId: string): Promise<ReportMergeConfig[]> => {
  const { data, error } = await supabase
    .from("relatorio_mesclagens")
    .select("*")
    .eq("pesquisa_id", pesquisaId)
    .order("created_at", { ascending: true });

  if (error) throw getFriendlyError(error);
  return (data || []) as ReportMergeConfig[];
};

const createReportMerge = async (input: ReportMergeInput): Promise<ReportMergeConfig> => {
  const { data, error } = await supabase
    .from("relatorio_mesclagens")
    .insert(input)
    .select()
    .single();

  if (error) throw getFriendlyError(error);
  return data as ReportMergeConfig;
};

const updateReportMerge = async (
  id: string,
  input: Pick<ReportMergeInput, "campo_demografico" | "pergunta_id">,
): Promise<ReportMergeConfig> => {
  const { data, error } = await supabase
    .from("relatorio_mesclagens")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw getFriendlyError(error);
  return data as ReportMergeConfig;
};

const deleteReportMerge = async (id: string): Promise<void> => {
  const { error } = await supabase.from("relatorio_mesclagens").delete().eq("id", id);
  if (error) throw getFriendlyError(error);
};

export const reportMergeService = {
  listReportMerges,
  createReportMerge,
  updateReportMerge,
  deleteReportMerge,
};
