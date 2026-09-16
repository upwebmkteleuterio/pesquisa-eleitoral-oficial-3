import type { ReportDemographicField, ReportMergeCardData, ReportMergeConfig, Submission, Survey } from "../types";
import { aggregateQuestionResponses, normalizeResponse } from "./responseNormalization";

export const DEMOGRAPHIC_FIELD_LABELS: Record<ReportDemographicField, string> = {
  sexo: "Sexo",
  faixa_etaria: "Faixa etária",
  renda: "Renda",
  escolaridade: "Escolaridade",
  religiao: "Religião",
  estado_civil: "Estado civil",
};

const DEMOGRAPHIC_VALUE_LABELS: Record<ReportDemographicField, Record<string, string>> = {
  sexo: { masculino: "Masculino", feminino: "Feminino", outro: "Outro" },
  faixa_etaria: { "16-24": "16-24 anos", "25-34": "25-34 anos", "35-44": "35-44 anos", "45-59": "45-59 anos", "60+": "60+ anos" },
  renda: { ate_1sm: "Até 1 SM", "1_2sm": "1-2 SM", "2_5sm": "2-5 SM", "5_10sm": "5-10 SM", mais_10sm: "+10 SM", sem_renda: "Sem renda" },
  escolaridade: {
    analfabeto: "Analfabeto",
    fundamental_inc: "Fundamental incompleto",
    fund_incomp: "Fundamental incompleto",
    fundamental_comp: "Fundamental completo",
    fund_comp: "Fundamental completo",
    medio_inc: "Médio incompleto",
    medio_incomp: "Médio incompleto",
    medio_comp: "Médio completo",
    superior_inc: "Superior incompleto",
    superior_incomp: "Superior incompleto",
    superior_comp: "Superior completo",
  },
  religiao: { catolico: "Católico", evangelico: "Evangélico", espirita: "Espírita", umbanda_candomble: "Umbanda/Candomblé", outra: "Outra", sem_religiao: "Sem religião" },
  estado_civil: { solteiro: "Solteiro", casado: "Casado", divorciado: "Divorciado", viuvo: "Viúvo", uniao_estavel: "União estável" },
};

export const getDemographicValueLabel = (field: ReportDemographicField, value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "Não informado";
  const normalizedValue = value.trim().toLocaleLowerCase("pt-BR");
  const mappedValue = DEMOGRAPHIC_VALUE_LABELS[field]?.[normalizedValue];
  if (mappedValue) return mappedValue;
  return normalizedValue.replace(/_/g, " ").replace(/^(.)/, character => character.toLocaleUpperCase("pt-BR"));
};

const answerValues = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value.flat(Infinity);
  return value === null || value === undefined || value === "" ? [] : [value];
};

export const buildReportMergeCard = (
  config: ReportMergeConfig,
  survey: Survey | undefined,
  validSubmissions: Submission[],
): ReportMergeCardData => {
  const question = survey?.schema_dinamico?.questions?.find((item: any) => item.id === config.pergunta_id);
  const questionLabel = question?.label || config.pergunta_id;
  const counts = aggregateQuestionResponses(questionLabel, validSubmissions.map(submission => submission.respostas_dinamicas?.[config.pergunta_id]));
  const byAnswer = new Map(counts.map(answer => [answer.name, { total: 0, breakdown: new Map<string, number>() }]));

  validSubmissions.forEach(submission => {
    const values = answerValues(submission.respostas_dinamicas?.[config.pergunta_id]);
    const demographic = getDemographicValueLabel(config.campo_demografico, submission.dados_fixos?.[config.campo_demografico]);
    (values.length ? values : [null]).forEach(value => {
      const answerLabel = value === null ? "Sem resposta" : normalizeResponse(value, questionLabel) || "Sem resposta";
      const answer = byAnswer.get(answerLabel) || { total: 0, breakdown: new Map<string, number>() };
      answer.total += 1;
      answer.breakdown.set(demographic, (answer.breakdown.get(demographic) || 0) + 1);
      byAnswer.set(answerLabel, answer);
    });
  });

  const denominator = Array.from(byAnswer.values()).reduce((sum, answer) => sum + answer.total, 0);
  const answers = Array.from(byAnswer.entries()).map(([label, answer]) => ({
    label,
    total: answer.total,
    percentage: denominator ? (answer.total / denominator) * 100 : 0,
    breakdown: Array.from(answer.breakdown.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "pt-BR"))
      .map(([breakdownLabel, total]) => ({ label: breakdownLabel, total, percentage: answer.total ? (total / answer.total) * 100 : 0 })),
  })).sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "pt-BR"));

  return {
    config,
    demographicLabel: DEMOGRAPHIC_FIELD_LABELS[config.campo_demografico],
    questionLabel,
    totalResponses: validSubmissions.length,
    totalAnswers: denominator,
    answers,
  };
};
