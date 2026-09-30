import type { ReportQuestionMergeCardData, ReportQuestionMergeConfig, Submission, Survey } from "../types";

export const isEligibleReportQuestion = (question: any): boolean => Boolean(
  question && question.type !== "text" && (
    Array.isArray(question.options) && question.options.length > 0
    || ["radio", "select", "checkbox"].includes(question.type)
  ),
);

const optionText = (option: unknown): string | null => {
  if (typeof option === "string" || typeof option === "number") return String(option).trim() || null;
  if (!option || typeof option !== "object") return null;
  const item = option as { label?: unknown; value?: unknown; name?: unknown };
  const value = item.label ?? item.value ?? item.name;
  return typeof value === "string" || typeof value === "number" ? String(value).trim() || null : null;
};

const normalizedKey = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^\p{L}\p{N}]+/gu, "");

const flattenedValues = (value: unknown): unknown[] => Array.isArray(value) ? value.flat(Infinity) : [value];

const responseLabel = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return null;
  const label = String(value).trim().replace(/\s+/g, " ");
  return label || null;
};

export const buildReportQuestionMergeCard = (
  config: ReportQuestionMergeConfig,
  survey: Survey | undefined,
  submissions: Submission[],
): ReportQuestionMergeCardData => {
  const questions = survey?.schema_dinamico?.questions || [];
  const selectedQuestions = config.pergunta_ids.flatMap(id => {
    const question = questions.find((item: any) => item.id === id);
    return question ? [question] : [];
  });
  const labels = new Map<string, string>();
  const aliases = new Map<string, string>();

  selectedQuestions.forEach((question: any) => {
    (question.options || []).forEach((option: unknown, index: number) => {
      const label = optionText(option);
      if (!label) return;
      const key = normalizedKey(label);
      if (!labels.has(key)) labels.set(key, label);
      aliases.set(key, key);
      const optionAliases = typeof option === "object" && option !== null
        ? (option as { aliases?: unknown; option_aliases?: unknown }).aliases ?? (option as { option_aliases?: unknown }).option_aliases
        : question.option_aliases?.[index];
      if (Array.isArray(optionAliases)) optionAliases.forEach(alias => {
        if (typeof alias !== "string") return;
        const aliasKey = normalizedKey(alias);
        if (aliasKey && !aliases.has(aliasKey)) aliases.set(aliasKey, key);
      });
      if (Array.isArray(question.option_aliases?.[index])) question.option_aliases[index].forEach((alias: unknown) => {
        if (typeof alias !== "string") return;
        const aliasKey = normalizedKey(alias);
        if (aliasKey && !aliases.has(aliasKey)) aliases.set(aliasKey, key);
      });
    });
  });

  const counts = new Map<string, number>(Array.from(labels.keys(), key => [key, 0]));
  config.pergunta_ids.forEach(questionId => {
    submissions.forEach(submission => {
      flattenedValues(submission.respostas_dinamicas?.[questionId]).forEach(value => {
        const label = responseLabel(value);
        if (!label) return;
        const key = aliases.get(normalizedKey(label)) || normalizedKey(label);
        if (!labels.has(key)) labels.set(key, label);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
  });

  const totalAnswers = Array.from(counts.values()).reduce((total, count) => total + count, 0);
  const answers = Array.from(counts.entries())
    .map(([key, total]) => ({ label: labels.get(key) || key, total, percentage: totalAnswers ? total / totalAnswers * 100 : 0 }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "pt-BR"));

  return {
    config,
    questionLabels: selectedQuestions.map((question: any) => question.label || question.id),
    totalAnswers,
    answers,
  };
};
