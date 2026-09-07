import { supabase } from "@/src/integrations/supabase/client";

export interface MergeManualSurveyResponsesParams {
  p_pesquisa_id: string;
  p_pergunta_id: string;
  p_nova_resposta: string;
  p_valores_antigos: string[];
}

async function mergeManualSurveyResponses(
  params: MergeManualSurveyResponsesParams,
): Promise<void> {
  const { error } = await supabase.rpc("merge_manual_survey_responses", params);

  if (error) throw error;
}

export const responseMergeService = {
  mergeManualSurveyResponses,
};
