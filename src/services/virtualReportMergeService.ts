import { supabase } from "@/src/integrations/supabase/client";
import type { VirtualReportMergeConfig } from "../types";

export interface VirtualReportMergeInput {
  nome: string;
  pesquisa_ids: string[];
  cards: VirtualReportMergeConfig["cards"];
  criado_por?: string | null;
}

const friendlyError = (error: { code?: string; message?: string }) => {
  if (error.code === "23505") return new Error("Já existe uma configuração com esse nome.");
  return new Error(error.message || "Não foi possível salvar a configuração virtual.");
};

const listVirtualReportMerges = async (): Promise<VirtualReportMergeConfig[]> => {
  const { data, error } = await supabase
    .from("relatorio_mesclagens_virtuais")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw friendlyError(error);
  return (data || []) as VirtualReportMergeConfig[];
};

const createVirtualReportMerge = async (input: VirtualReportMergeInput) => {
  const { data, error } = await supabase
    .from("relatorio_mesclagens_virtuais")
    .insert(input)
    .select()
    .single();
  if (error) throw friendlyError(error);
  return data as VirtualReportMergeConfig;
};

const updateVirtualReportMerge = async (id: string, input: VirtualReportMergeInput) => {
  const { data, error } = await supabase
    .from("relatorio_mesclagens_virtuais")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw friendlyError(error);
  return data as VirtualReportMergeConfig;
};

const deleteVirtualReportMerge = async (id: string) => {
  const { error } = await supabase.from("relatorio_mesclagens_virtuais").delete().eq("id", id);
  if (error) throw friendlyError(error);
};

export const virtualReportMergeService = {
  listVirtualReportMerges,
  createVirtualReportMerge,
  updateVirtualReportMerge,
  deleteVirtualReportMerge,
};
