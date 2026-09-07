
export function calculateFormProgress(
  fixedFields: Record<string, any>,
  dynamicResponses: Record<string, any>,
  totalQuestions: number
): number {
  // Campos fixos obrigatórios
  const fixedFieldsToCount = ['nome', 'telefone', 'sexo', 'faixa_etaria', 'escolaridade', 'religiao', 'renda', 'estado_civil'];
  const filledFixed = fixedFieldsToCount.filter(field => !!fixedFields[field]).length;
  
  // Perguntas dinâmicas preenchidas
  const filledDynamic = Object.values(dynamicResponses).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }).length;

  const totalFields = fixedFieldsToCount.length + totalQuestions;
  if (totalFields === 0) return 0;

  const progress = ((filledFixed + filledDynamic) / totalFields) * 100;
  return Math.round(progress);
}
